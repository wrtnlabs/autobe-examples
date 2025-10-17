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

export async function postDiscussionBoardMemberTopics(props: {
  member: MemberPayload;
  body: IDiscussionBoardTopic.ICreate;
}): Promise<IDiscussionBoardTopic> {
  const { member, body } = props;

  const category = await MyGlobal.prisma.discussion_board_categories.findFirst({
    where: {
      id: body.category_id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (!category) {
    throw new HttpException("Category not found or inactive", 404);
  }

  if (body.tag_ids !== null && body.tag_ids.length > 0) {
    const tags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        id: { in: body.tag_ids },
        status: "active",
        deleted_at: null,
      },
    });

    if (tags.length !== body.tag_ids.length) {
      throw new HttpException("One or more tags not found or inactive", 404);
    }
  }

  const now = toISOStringSafe(new Date());
  const topicId = v4();

  await MyGlobal.prisma.discussion_board_topics.create({
    data: {
      id: topicId,
      discussion_board_category_id: body.category_id,
      discussion_board_member_id: member.id,
      title: body.title,
      body: body.body,
      status: "active",
      view_count: 0,
      reply_count: 0,
      is_pinned: false,
      created_at: now,
      updated_at: now,
    },
  });

  if (body.tag_ids !== null && body.tag_ids.length > 0) {
    await MyGlobal.prisma.discussion_board_topic_tags.createMany({
      data: body.tag_ids.map((tagId) => ({
        id: v4(),
        discussion_board_topic_id: topicId,
        discussion_board_tag_id: tagId,
        created_at: now,
        updated_at: now,
      })),
    });
  }

  const topic = await MyGlobal.prisma.discussion_board_topics.findUniqueOrThrow(
    {
      where: { id: topicId },
      include: {
        category: true,
        author: true,
        discussion_board_topic_tags: {
          include: {
            tag: true,
          },
          where: {
            deleted_at: null,
          },
        },
      },
    },
  );

  return {
    id: topic.id,
    title: topic.title,
    body: topic.body,
    category: {
      id: topic.category.id,
      name: topic.category.name,
      slug: topic.category.slug,
    },
    author: {
      id: topic.author.id,
      username: topic.author.username,
      display_name: topic.author.display_name,
      avatar_url: topic.author.avatar_url ?? null,
    },
    tags: topic.discussion_board_topic_tags.map((tt) => ({
      id: tt.tag.id,
      name: tt.tag.name,
    })),
    status: typia.assert<"active" | "locked" | "archived" | "deleted">(
      topic.status,
    ),
    view_count: topic.view_count,
    reply_count: topic.reply_count,
    is_pinned: topic.is_pinned,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
  };
}
