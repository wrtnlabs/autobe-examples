import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentDownload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentDownloadAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentDownloadAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAnalyticsDownloads(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentDownload.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentDownload.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_attachment_downloadsWhereInput = {
    deleted_at: null,
    ...(props.body.discussion_board_attachment_id && {
      discussion_board_attachment_id: props.body.discussion_board_attachment_id,
    }),
    ...(props.body.actor_type && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.ip && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.user_agent && {
      user_agent: { contains: props.body.user_agent },
    }),
  };
  const data =
    await MyGlobal.prisma.discussion_board_attachment_downloads.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAttachmentDownloadAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_attachment_downloads.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAttachmentDownloadAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
