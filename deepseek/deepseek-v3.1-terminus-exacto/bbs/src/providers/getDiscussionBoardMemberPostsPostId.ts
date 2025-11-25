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

export async function getDiscussionBoardMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPost> {
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
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

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Authorization: Members can access published and archived posts
  // For draft posts, additional authorization checks would be needed
  // but the schema doesn't show member_id reference, so we'll stick to basic access
  if (post.status !== "published" && post.status !== "archived") {
    throw new HttpException("Access denied", 403);
  }

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    status: post.status,
    is_pinned: post.is_pinned,
    is_locked: post.is_locked,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    published_at: post.published_at
      ? toISOStringSafe(post.published_at)
      : undefined,
    archived_at: post.archived_at
      ? toISOStringSafe(post.archived_at)
      : undefined,
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : undefined,
    channel: {
      id: post.channel.id,
      name: post.channel.name,
      description: post.channel.description,
      status: post.channel.status,
      created_at: toISOStringSafe(post.channel.created_at),
    },
    section: {
      id: post.section.id,
      name: post.section.name,
      description: post.section.description,
      status: post.section.status,
      channel: {
        id: post.section.channel.id,
        name: post.section.channel.name,
        description: post.section.channel.description,
        status: post.section.channel.status,
        created_at: toISOStringSafe(post.section.channel.created_at),
      },
      created_at: toISOStringSafe(post.section.created_at),
      updated_at: toISOStringSafe(post.section.updated_at),
      deleted_at: post.section.deleted_at
        ? toISOStringSafe(post.section.deleted_at)
        : undefined,
    },
  };
}
