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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAttachmentSnapshots(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.discussion_board_attachment_id !== undefined && {
      discussion_board_attachment_id: props.body.discussion_board_attachment_id,
    }),
    ...(props.body.captured_at_start !== undefined && {
      captured_at: {
        gte: new Date(props.body.captured_at_start),
      },
    }),
    ...(props.body.captured_at_end !== undefined && {
      captured_at: {
        lte: new Date(props.body.captured_at_end),
      },
    }),
  } satisfies Prisma.discussion_board_attachment_snapshotsWhereInput;
  // Determine sort order
  const orderByInput = (
    props.body.sort === "captured_at:desc"
      ? { captured_at: "desc" as const }
      : { captured_at: "asc" as const }
  ) satisfies Prisma.discussion_board_attachment_snapshotsOrderByWithRelationInput;
  // Query data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_attachment_snapshots.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAttachmentSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_attachment_snapshots.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
