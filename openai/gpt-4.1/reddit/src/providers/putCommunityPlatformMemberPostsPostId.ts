import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // Fetch the original post
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Only the author can update their own post via this endpoint
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("You are not the author of this post", 403);
  }
  // Member must be active and not deleted
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!member) {
    throw new HttpException("Your account is not active", 403);
  }
  // Enforce edit window (default: 15 min / post_edit_window_seconds system config)
  const cfg = await MyGlobal.prisma.community_platform_system_configs.findFirst(
    {
      where: { key: "post_edit_window_seconds" },
    },
  );
  const windowSeconds = cfg ? Number(cfg.value) : 900;
  const createdAtEpoch = Date.parse(
    typeof post.created_at === "string"
      ? post.created_at
      : toISOStringSafe(post.created_at),
  );
  const nowEpoch = Date.now();
  if (nowEpoch - createdAtEpoch > windowSeconds * 1000) {
    throw new HttpException("Edit window has expired", 400);
  }
  if (post.status === "archived" || post.status === "removed") {
    throw new HttpException("Cannot edit archived or removed posts", 400);
  }
  // Banned words validation (for active banned words only)
  const bannedWords =
    await MyGlobal.prisma.community_platform_banned_words.findMany({
      where: { active: true },
    });
  const bannedWordList = bannedWords.map((bw) => bw.word);
  if (props.body.title) {
    for (const word of bannedWordList) {
      if (props.body.title.includes(word)) {
        throw new HttpException("Title contains a banned word", 400);
      }
    }
  }
  if (props.body.content_body) {
    for (const word of bannedWordList) {
      if (props.body.content_body.includes(word)) {
        throw new HttpException("Content contains a banned word", 400);
      }
    }
  }
  // Build update input (permitted fields only)
  const updateInput = {
    title: props.body.title ?? undefined,
    content_body: props.body.content_body ?? undefined,
    content_type: props.body.content_type ?? undefined,
    status: props.body.status ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };
  // Apply the update
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: updateInput,
  });
  // Return, formatting all date-time fields
  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id: updated.community_platform_community_id,
    title: updated.title,
    content_body:
      updated.content_body === null ? undefined : updated.content_body,
    content_type: updated.content_type,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
