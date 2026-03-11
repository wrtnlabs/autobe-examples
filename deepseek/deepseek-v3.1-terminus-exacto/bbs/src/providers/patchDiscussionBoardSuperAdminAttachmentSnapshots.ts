import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAttachmentSnapshots(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_attachment_snapshotsWhereInput = {
    deleted_at: null,
    ...(props.body.discussion_board_attachment_id !== undefined && {
      discussion_board_attachment_id: props.body.discussion_board_attachment_id,
    }),
    ...(props.body.captured_at_start !== undefined && {
      captured_at: { gte: props.body.captured_at_start },
    }),
    ...(props.body.captured_at_end !== undefined && {
      captured_at: { lte: props.body.captured_at_end },
    }),
  };
  const orderByInput = (
    props.body.sort === "captured_at:asc"
      ? { captured_at: "asc" as const }
      : { captured_at: "desc" as const }
  ) satisfies Prisma.discussion_board_attachment_snapshotsOrderByWithRelationInput;
  const selector =
    DiscussionBoardAttachmentSnapshotAtSummaryTransformer.select();
  const data =
    await MyGlobal.prisma.discussion_board_attachment_snapshots.findMany({
      where: whereInput,
      select: selector.select,
      orderBy: orderByInput,
      skip: skip,
      take: limit,
    });
  const total =
    await MyGlobal.prisma.discussion_board_attachment_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAttachmentSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
