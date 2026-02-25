import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleFileAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdImages(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  // Verify article exists and get section ID
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, deleted_at: null },
      select: {
        id: true,
        discussion_board_section_id: true,
      },
    });
  // Check if admin has permission to manage this section through section administrators table
  const sectionAdmin =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_section_id: article.discussion_board_section_id,
        discussion_board_admin_id: props.admin.id,
      },
    });
  if (!sectionAdmin) {
    throw new HttpException(
      "Access denied: Admin not assigned to this section",
      403,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions with proper field names from schema
  const whereInput: Prisma.discussion_board_article_imagesWhereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.display_order !== undefined &&
      props.body.display_order !== null && {
        display_order: props.body.display_order,
      }),
    ...(props.body.alt_text && { alt_text: { contains: props.body.alt_text } }),
    ...(props.body.caption && { caption: { contains: props.body.caption } }),
  };
  // Fetch paginated data with proper select pattern
  const data = await MyGlobal.prisma.discussion_board_article_images.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { display_order: "asc" },
    ...DiscussionBoardArticleFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleFileAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
