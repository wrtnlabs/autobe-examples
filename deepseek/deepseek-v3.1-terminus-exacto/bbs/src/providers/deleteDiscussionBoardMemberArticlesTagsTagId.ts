import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesTagsTagId(props: {
  member: MemberPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the tag association with related article for ownership check
  const tagAssociation =
    await MyGlobal.prisma.discussion_board_article_tags.findUnique({
      where: { id: props.tagId },
      select: {
        id: true,
        article: {
          select: {
            discussion_board_member_id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    });
  // 2. Handle not found with descriptive error
  if (!tagAssociation) {
    throw new HttpException("Tag association not found", 404);
  }
  // 3. Check authorization: member must be article author
  if (tagAssociation.article.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You are not authorized to delete this tag association",
      403,
    );
  }
  // 4. Delete the tag association
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: { id: props.tagId },
  });
}
