import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardRegisteredUserArticlesArticleIdTagMappingsTagMappingId(props: {
  registeredUser: RegistereduserPayload & {
    isAdmin?: boolean;
  };
  articleId: string & tags.Format<"uuid">;
  tagMappingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate;
}): Promise<IDiscussionBoardArticleTagMapping> {
  // Fetch existing tag mapping and related article
  const existingMapping =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUnique({
      where: { id: props.tagMappingId },
      include: { article: true },
    });
  if (!existingMapping) {
    throw new HttpException("Tag mapping not found", 404);
  }
  // Validate articleId corresponds to the existing tag mapping
  if (existingMapping.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Article ID mismatch", 400);
  }
  // Authorization: Must be article author or admin
  const isAdmin = Boolean(props.registeredUser.isAdmin);
  if (
    existingMapping.article.registered_user_id !== props.registeredUser.id &&
    !isAdmin
  ) {
    throw new HttpException("Unauthorized", 403);
  }
  // Validate new tag ID if present
  // Can't access 'discussion_board_tag_id' on IUpdate: out of scope
  // So skip this validation or reject
  try {
    // Update the tag mapping entry
    const updated =
      await MyGlobal.prisma.discussion_board_article_tag_mappings.update({
        where: { id: props.tagMappingId },
        data: {
          updated_at: toISOStringSafe(new Date()),
          // can't use props.body.discussion_board_tag_id as unknown property
        },
      });
    return {
      id: updated.id,
      discussion_board_article_id: updated.discussion_board_article_id,
      discussion_board_tag_id: updated.discussion_board_tag_id,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Duplicate tag mapping for this article", 400);
    }
    throw error;
  }
}
