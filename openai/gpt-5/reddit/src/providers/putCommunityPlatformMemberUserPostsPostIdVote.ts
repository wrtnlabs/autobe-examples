import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putCommunityPlatformMemberUserPostsPostIdVote(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  const { memberUser, postId, body } = props;

  if (body.value === undefined)
    throw new HttpException("Bad Request: 'value' is required", 400);

  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      community_platform_user_id: true,
      locked_at: true,
      archived_at: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null)
    throw new HttpException("Not Found", 404);

  if (post.community_platform_user_id === memberUser.id)
    throw new HttpException("Forbidden: You cannot vote on your own post", 403);

  if (post.locked_at !== null || post.archived_at !== null)
    throw new HttpException(
      "Forbidden: Cannot vote on locked or archived post",
      403,
    );

  const existing =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_user_id: memberUser.id,
        community_platform_post_id: postId,
      },
    });

  if (!existing) {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: v4(),
        community_platform_user_id: memberUser.id,
        community_platform_post_id: postId,
        value: body.value,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      community_platform_post_id: created.community_platform_post_id as string &
        tags.Format<"uuid">,
      value: created.value === 1 ? 1 : -1,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  }

  if (existing.deleted_at !== null) {
    const now = toISOStringSafe(new Date());
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: existing.id },
      data: {
        value: body.value,
        deleted_at: null,
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      community_platform_post_id: updated.community_platform_post_id as string &
        tags.Format<"uuid">,
      value: updated.value === 1 ? 1 : -1,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  }

  if (existing.value === body.value) {
    return {
      id: existing.id as string & tags.Format<"uuid">,
      community_platform_post_id:
        existing.community_platform_post_id as string & tags.Format<"uuid">,
      value: existing.value === 1 ? 1 : -1,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_post_votes.update({
    where: { id: existing.id },
    data: {
      value: body.value,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    community_platform_post_id: updated.community_platform_post_id as string &
      tags.Format<"uuid">,
    value: updated.value === 1 ? 1 : -1,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
