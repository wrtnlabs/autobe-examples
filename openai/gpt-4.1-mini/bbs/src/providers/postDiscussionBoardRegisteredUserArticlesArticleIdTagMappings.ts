import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleTagMappingTransformer } from "../transformers/DiscussionBoardArticleTagMappingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserArticlesArticleIdTagMappings(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: {
    discussion_board_tag_ids: (string & tags.Format<"uuid">)[];
  };
}): Promise<IPageIDiscussionBoardArticleTagMapping.ISummary> {
  function getCurrentDateTime(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, registered_user_id: true },
    });
  if (article.registered_user_id !== props.registeredUser.id) {
    const isAdmin =
      await MyGlobal.prisma.discussion_board_administrators.findUnique({
        where: { id: props.registeredUser.id },
      });
    if (!isAdmin) throw new HttpException("Forbidden", 403);
  }
  const distinctTagIds = Array.from(
    new Set(props.body.discussion_board_tag_ids),
  );
  const validTags = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: { id: { in: distinctTagIds }, deleted_at: null },
    select: { id: true },
  });
  if (validTags.length !== distinctTagIds.length) {
    throw new HttpException("Invalid or deleted tag detected", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const tagId of distinctTagIds) {
      const exists = await tx.discussion_board_article_tag_mappings.findUnique({
        where: {
          discussion_board_article_id_discussion_board_tag_id: {
            discussion_board_article_id: props.articleId,
            discussion_board_tag_id: tagId,
          },
        },
        select: { id: true },
      });
      if (!exists) {
        await tx.discussion_board_article_tag_mappings.create({
          data: {
            id: v4(),
            discussion_board_article_id: props.articleId,
            discussion_board_tag_id: tagId,
            created_at: getCurrentDateTime(),
            updated_at: getCurrentDateTime(),
            deleted_at: null,
          },
        });
      }
    }
  });
  const tagMappings =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where: { discussion_board_article_id: props.articleId, deleted_at: null },
      ...DiscussionBoardArticleTagMappingTransformer.select(),
    });
  const transformed =
    await DiscussionBoardArticleTagMappingTransformer.transform(tagMappings);
  const current = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = transformed.length as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const records = limit;
  const pages = records === 0 ? 0 : 1;
  return {
    pagination: {
      current,
      limit,
      records,
      pages,
    },
    data: transformed,
  };
}
