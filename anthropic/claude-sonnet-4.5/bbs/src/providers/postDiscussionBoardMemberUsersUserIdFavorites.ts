import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFavorite";
import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberUsersUserIdFavorites(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardFavorite.ICreate;
}): Promise<IDiscussionBoardFavorite> {
  const { member, userId, body } = props;

  // Authorization: Verify userId matches authenticated member
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only manage your own favorites",
      403,
    );
  }

  // Verify member exists and is active
  const memberRecord = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: userId,
        deleted_at: null,
        account_status: "active",
        email_verified: true,
      },
    },
  );

  if (!memberRecord) {
    throw new HttpException("Member not found or not active", 404);
  }

  // Validate topic exists and is accessible
  const topic = await MyGlobal.prisma.discussion_board_topics.findFirst({
    where: {
      id: body.discussion_board_topic_id,
      deleted_at: null,
    },
    include: {
      category: true,
      author: true,
    },
  });

  if (!topic) {
    throw new HttpException(
      "Discussion topic not found or has been deleted",
      404,
    );
  }

  // Check for duplicate favorite (enforce unique constraint)
  const existingFavorite =
    await MyGlobal.prisma.discussion_board_favorites.findFirst({
      where: {
        discussion_board_member_id: userId,
        discussion_board_topic_id: body.discussion_board_topic_id,
        deleted_at: null,
      },
    });

  if (existingFavorite) {
    throw new HttpException("You have already favorited this topic", 409);
  }

  // Create favorite record with prepared values
  const now = toISOStringSafe(new Date());
  const favoriteId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.discussion_board_favorites.create({
    data: {
      id: favoriteId,
      discussion_board_member_id: userId,
      discussion_board_topic_id: body.discussion_board_topic_id,
      created_at: now,
      updated_at: now,
    },
  });

  // Assemble response with topic summary using prepared values
  const topicSummary: IDiscussionBoardTopic.ISummary = {
    id: topic.id as string & tags.Format<"uuid">,
    title: topic.title,
    category: {
      id: topic.category.id as string & tags.Format<"uuid">,
      name: topic.category.name,
      slug: topic.category.slug,
    },
    author: {
      id: topic.author.id as string & tags.Format<"uuid">,
      username: topic.author.username,
      display_name: topic.author.display_name,
      avatar_url: topic.author.avatar_url as
        | (string & tags.Format<"uri">)
        | null,
    },
    status: topic.status as "active" | "locked" | "archived" | "deleted",
    view_count: topic.view_count,
    reply_count: topic.reply_count,
    is_pinned: topic.is_pinned,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
  };

  return {
    id: favoriteId,
    discussion_board_topic_id: body.discussion_board_topic_id,
    topic: topicSummary,
    created_at: now,
    updated_at: now,
  };
}
