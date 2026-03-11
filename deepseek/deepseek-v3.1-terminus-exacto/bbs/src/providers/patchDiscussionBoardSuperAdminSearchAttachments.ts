import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSearchAttachments(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereFilter: Prisma.discussion_board_attachmentsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      filename: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.filetype && { filetype: props.body.filetype }),
    ...(props.body.mime_type && { mime_type: props.body.mime_type }),
    ...(props.body.size_min !== undefined && {
      size_bytes: { gte: props.body.size_min },
    }),
    ...(props.body.size_max !== undefined && {
      size_bytes: { lte: props.body.size_max },
    }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  };
  const data = await MyGlobal.prisma.discussion_board_attachments.findMany({
    where: whereFilter,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardAttachmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_attachments.count({
    where: whereFilter,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAttachmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
