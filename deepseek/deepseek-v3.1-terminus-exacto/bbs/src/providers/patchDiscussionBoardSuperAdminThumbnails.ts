import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentThumbnailAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentThumbnailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminThumbnails(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentThumbnail.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentThumbnail.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.attachment_id && {
      discussion_board_attachment_id: props.body.attachment_id,
    }),
    ...(props.body.size_category && {
      size_category: props.body.size_category,
    }),
    ...(props.body.width_min && { width: { gte: props.body.width_min } }),
    ...(props.body.width_max && { width: { lte: props.body.width_max } }),
    ...(props.body.height_min && { height: { gte: props.body.height_min } }),
    ...(props.body.height_max && { height: { lte: props.body.height_max } }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  } satisfies Prisma.discussion_board_attachment_thumbnailsWhereInput;
  const orderByInput = (
    props.body.sort === "width:asc"
      ? { width: "asc" as const }
      : props.body.sort === "width:desc"
        ? { width: "desc" as const }
        : props.body.sort === "height:asc"
          ? { height: "asc" as const }
          : props.body.sort === "height:desc"
            ? { height: "desc" as const }
            : props.body.sort === "created_at:desc"
              ? { created_at: "desc" as const }
              : { created_at: "asc" as const }
  ) satisfies Prisma.discussion_board_attachment_thumbnailsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.discussion_board_attachment_thumbnails.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAttachmentThumbnailAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_attachment_thumbnails.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAttachmentThumbnailAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
