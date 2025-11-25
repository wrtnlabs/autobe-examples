import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberPosts(props: {
  member: MemberPayload;
  body: IDiscussionBoardPost.ICreate;
}): Promise<IDiscussionBoardPost> {
  // Verify member exists and is active
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Verify channel exists and is active
  const channel = await MyGlobal.prisma.discussion_board_channels.findFirst({
    where: {
      id: props.body.discussion_board_channel_id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found or inactive", 404);
  }

  // Verify section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      id: props.body.discussion_board_section_id,
      status: "active",
      deleted_at: null,
      discussion_board_channel_id: props.body.discussion_board_channel_id,
    },
  });

  if (!section) {
    throw new HttpException("Section not found or inactive", 404);
  }

  const now = toISOStringSafe(new Date());

  const createdPost = await MyGlobal.prisma.discussion_board_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "member",
      title: props.body.title,
      content: props.body.content,
      status: "draft",
      is_pinned: false,
      is_locked: false,
      discussion_board_channel_id: props.body.discussion_board_channel_id,
      discussion_board_section_id: props.body.discussion_board_section_id,
      created_at: now,
      updated_at: now,
      published_at: null,
      archived_at: null,
      deleted_at: null,
    },
    include: {
      channel: true,
      section: {
        include: {
          channel: true,
        },
      },
    },
  });

  return {
    id: createdPost.id,
    title: createdPost.title,
    content: createdPost.content,
    status: createdPost.status,
    is_pinned: createdPost.is_pinned,
    is_locked: createdPost.is_locked,
    created_at: toISOStringSafe(createdPost.created_at),
    updated_at: toISOStringSafe(createdPost.updated_at),
    published_at: createdPost.published_at
      ? toISOStringSafe(createdPost.published_at)
      : undefined,
    archived_at: createdPost.archived_at
      ? toISOStringSafe(createdPost.archived_at)
      : undefined,
    deleted_at: createdPost.deleted_at
      ? toISOStringSafe(createdPost.deleted_at)
      : undefined,
    channel: {
      id: createdPost.channel.id,
      name: createdPost.channel.name,
      description: createdPost.channel.description,
      status: createdPost.channel.status,
      created_at: toISOStringSafe(createdPost.channel.created_at),
    },
    section: {
      id: createdPost.section.id,
      name: createdPost.section.name,
      description: createdPost.section.description,
      status: createdPost.section.status,
      channel: {
        id: createdPost.section.channel.id,
        name: createdPost.section.channel.name,
        description: createdPost.section.channel.description,
        status: createdPost.section.channel.status,
        created_at: toISOStringSafe(createdPost.section.channel.created_at),
      },
      created_at: toISOStringSafe(createdPost.section.created_at),
      updated_at: toISOStringSafe(createdPost.section.updated_at),
      deleted_at: createdPost.section.deleted_at
        ? toISOStringSafe(createdPost.section.deleted_at)
        : undefined,
    },
  };
}
