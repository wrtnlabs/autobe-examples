import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberTopicsTopicId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTopic.IUpdate;
}): Promise<IDiscussionBoardTopic> {
  const { member, topicId, body } = props;

  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: topicId },
    include: {
      category: true,
      author: true,
      discussion_board_replies: {
        select: { id: true },
      },
      discussion_board_topic_tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  if (topic.deleted_at) {
    throw new HttpException("Cannot edit deleted topic", 403);
  }

  if (topic.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only edit your own topics",
      403,
    );
  }

  if (topic.status === "locked") {
    throw new HttpException(
      "Cannot edit locked topic. Only administrators can edit locked topics.",
      403,
    );
  }

  const nowISO = toISOStringSafe(new Date());
  const nowTime = new Date(nowISO).getTime();
  const createdTime = new Date(topic.created_at).getTime();
  const hoursSinceCreation = (nowTime - createdTime) / (1000 * 60 * 60);

  const userReputation =
    await MyGlobal.prisma.discussion_board_user_reputation.findUnique({
      where: { discussion_board_member_id: member.id },
    });

  const reputationScore = userReputation?.total_score ?? 0;
  const editWindowHours = reputationScore >= 100 ? 168 : 24;

  if (hoursSinceCreation > editWindowHours) {
    throw new HttpException(
      `Edit window expired. Members can edit topics within ${editWindowHours / 24} days of creation.`,
      403,
    );
  }

  const replyCount = topic.discussion_board_replies.length;
  if (replyCount > 10 && body.title !== null && body.title !== undefined) {
    throw new HttpException(
      "Cannot change title: topic has more than 10 replies. Title is locked to maintain discussion context.",
      403,
    );
  }

  if (body.category_id !== null && body.category_id !== undefined) {
    const category =
      await MyGlobal.prisma.discussion_board_categories.findUnique({
        where: { id: body.category_id },
      });

    if (!category) {
      throw new HttpException("Category not found", 404);
    }

    if (!category.is_active) {
      throw new HttpException("Cannot assign to inactive category", 400);
    }
  }

  if (
    body.tag_ids !== null &&
    body.tag_ids !== undefined &&
    body.tag_ids.length > 0
  ) {
    const tags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: { id: { in: body.tag_ids } },
    });

    if (tags.length !== body.tag_ids.length) {
      throw new HttpException("One or more tags not found", 404);
    }

    const inactiveTags = tags.filter((tag) => tag.status !== "active");
    if (inactiveTags.length > 0) {
      throw new HttpException("Cannot use inactive tags", 400);
    }
  }

  const updatedTopic = await MyGlobal.prisma.discussion_board_topics.update({
    where: { id: topicId },
    data: {
      title: body.title === null ? undefined : body.title,
      body: body.body === null ? undefined : body.body,
      discussion_board_category_id:
        body.category_id === null ? undefined : body.category_id,
      updated_at: nowISO,
    },
  });

  if (body.tag_ids !== null && body.tag_ids !== undefined) {
    await MyGlobal.prisma.discussion_board_topic_tags.deleteMany({
      where: { discussion_board_topic_id: topicId },
    });

    if (body.tag_ids.length > 0) {
      const tagCreateTime = toISOStringSafe(new Date());
      await MyGlobal.prisma.discussion_board_topic_tags.createMany({
        data: body.tag_ids.map((tagId) => ({
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_topic_id: topicId,
          discussion_board_tag_id: tagId,
          created_at: tagCreateTime,
          updated_at: tagCreateTime,
          deleted_at: null,
        })),
      });
    }
  }

  const editHistoryTime = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_edit_history.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id,
      entity_type: "topic",
      entity_id: topicId,
      previous_content: JSON.stringify({
        title: topic.title,
        body: topic.body,
        category_id: topic.discussion_board_category_id,
      }),
      new_content: JSON.stringify({
        title: updatedTopic.title,
        body: updatedTopic.body,
        category_id: updatedTopic.discussion_board_category_id,
      }),
      edit_reason: null,
      created_at: editHistoryTime,
      deleted_at: null,
    },
  });

  const finalTopic =
    await MyGlobal.prisma.discussion_board_topics.findUniqueOrThrow({
      where: { id: topicId },
      include: {
        category: true,
        author: true,
        discussion_board_topic_tags: {
          include: {
            tag: true,
          },
        },
      },
    });

  return {
    id: finalTopic.id as string & tags.Format<"uuid">,
    title: finalTopic.title,
    body: finalTopic.body,
    category: {
      id: finalTopic.category.id as string & tags.Format<"uuid">,
      name: finalTopic.category.name,
      slug: finalTopic.category.slug,
    },
    author: {
      id: finalTopic.author.id as string & tags.Format<"uuid">,
      username: finalTopic.author.username,
      display_name: finalTopic.author.display_name,
      avatar_url: finalTopic.author.avatar_url,
    },
    tags: finalTopic.discussion_board_topic_tags.map((tt) => ({
      id: tt.tag.id as string & tags.Format<"uuid">,
      name: tt.tag.name,
    })),
    status: finalTopic.status as "active" | "locked" | "archived" | "deleted",
    view_count: finalTopic.view_count,
    reply_count: finalTopic.reply_count,
    is_pinned: finalTopic.is_pinned,
    created_at: toISOStringSafe(finalTopic.created_at),
    updated_at: toISOStringSafe(finalTopic.updated_at),
  };
}
