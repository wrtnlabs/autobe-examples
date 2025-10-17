import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const { member, postId, body } = props;

  // Step 1: Verify member status is active (optional, already enforced at decorator level, but defensively check)
  const memberRow = await MyGlobal.prisma.community_platform_members.findUnique(
    {
      where: { id: member.id, deleted_at: null, status: "active" },
    },
  );
  if (memberRow === null) {
    throw new HttpException("Member not found or inactive", 403);
  }

  // Step 2: Fetch post, confirm exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (post === null) {
    throw new HttpException("Post not found or deleted", 404);
  }

  // Step 3: If parent_id provided, validate parent exists, post matches, not deleted, get nesting_level; else, nesting_level=1
  let nesting_level = 1;
  let parent_id: (string & tags.Format<"uuid">) | undefined = undefined;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parentComment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: body.parent_id, deleted_at: null },
        select: {
          id: true,
          community_platform_post_id: true,
          nesting_level: true,
        },
      });
    if (
      parentComment === null ||
      parentComment.community_platform_post_id !== postId
    ) {
      throw new HttpException(
        "Parent comment not found, deleted, or not in this post",
        400,
      );
    }
    nesting_level = parentComment.nesting_level + 1;
    parent_id = body.parent_id;
  }

  // Step 4: Insert the comment
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: v4(),
      community_platform_post_id: postId,
      community_platform_member_id: member.id,
      parent_id: parent_id ?? null,
      body: body.body,
      nesting_level: nesting_level,
      status: "published",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Return response, converting dates and optional/nullable fields as required
  return {
    id: created.id,
    community_platform_post_id: created.community_platform_post_id,
    community_platform_member_id: created.community_platform_member_id,
    parent_id: created.parent_id ?? undefined,
    body: created.body,
    nesting_level: created.nesting_level,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
