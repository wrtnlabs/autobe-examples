import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Step 1: Ensure target post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.body.post_id, deleted_at: null },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      title: true,
      // Minimum for ISummary
    },
  });
  if (!post) {
    throw new HttpException("Post does not exist or has been deleted", 404);
  }

  // Step 2: If parent_id provided, validate parent comment under same post
  let parent: { id: string } | null = null;
  if (props.body.parent_id) {
    parent = await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: props.body.parent_id, post_id: props.body.post_id },
      select: { id: true },
    });
    if (!parent) {
      throw new HttpException(
        "Parent comment not found under the same post",
        400,
      );
    }
  }

  // Step 3: Insert the new comment
  const now = toISOStringSafe(new Date());
  const comment = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: v4(),
      post_id: props.body.post_id,
      user_id: props.user.id,
      user_session_id: props.user.session_id,
      parent_id: props.body.parent_id ?? null,
      body: props.body.body,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Gather summary info for API return value
  const authorSummary = { id: comment.user_id };
  const postSummary = {
    id: comment.post_id,
    community_id: post.community_id,
    user_id: post.user_id,
  };
  const userSessionSummary = { id: comment.user_session_id, created_at: now };
  let parentSummary: ICommunityPlatformComment.ISummary | null | undefined =
    undefined;
  if (comment.parent_id) {
    parentSummary = {
      id: comment.parent_id,
      user: { id: comment.user_id },
      post: postSummary,
      parent_id: undefined,
      created_at: now,
    };
  }
  return {
    id: comment.id,
    post: postSummary,
    author: authorSummary,
    userSession: userSessionSummary,
    parent: parentSummary,
    body: comment.body,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
}
