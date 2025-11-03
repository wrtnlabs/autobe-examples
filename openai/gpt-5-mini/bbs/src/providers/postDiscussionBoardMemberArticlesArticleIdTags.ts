import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdTags(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  const { member, articleId, body } = props;

  // Verify target article exists and is not soft-deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
      where: { id: articleId, deleted_at: null },
      select: {
        id: true,
        title: true,
        discussion_board_member_id: true,
        created_at: true,
      },
    });

  // Authorization: only the article author may assign tags
  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the article author can assign tags",
      403,
    );
  }

  // Resolve tag by slug
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { slug: body.tagSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!tag) {
    throw new HttpException("Tag not found", 404);
  }

  // Prepare values
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Attempt to create junction row; handle unique-constraint race with try/catch
  try {
    await MyGlobal.prisma.discussion_board_article_tags.create({
      data: {
        id,
        discussion_board_article_id: articleId,
        discussion_board_tag_id: tag.id,
        created_at: now,
        created_by_member_id: member.id,
      },
    });
  } catch (e) {
    // Prisma unique constraint or other DB error
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Unique violation on (discussion_board_article_id, discussion_board_tag_id)
      throw new HttpException("Tag already assigned to article", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }

  // Fetch creator summary (member) for response
  const creator =
    await MyGlobal.prisma.discussion_board_member.findUniqueOrThrow({
      where: { id: member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        created_at: true,
      },
    });

  // Build response matching IDiscussionBoardArticleTag
  return {
    id: id as string & tags.Format<"uuid">,
    article: {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      createdAt: toISOStringSafe(article.created_at),
    },
    tag: {
      id: tag.id as string & tags.Format<"uuid">,
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? null,
      is_active: tag.is_active,
      created_at: toISOStringSafe(tag.created_at),
      updated_at: tag.updated_at ? toISOStringSafe(tag.updated_at) : null,
      deleted_at: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
    },
    createdAt: now,
    createdBy: {
      id: creator.id as string & tags.Format<"uuid">,
      username: creator.username,
      display_name: creator.display_name ?? null,
      created_at: toISOStringSafe(creator.created_at),
    },
  };
}
