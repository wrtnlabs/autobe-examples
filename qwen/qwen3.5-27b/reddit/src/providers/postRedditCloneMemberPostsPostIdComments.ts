import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentCollector } from "../collectors/RedditCloneCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.ICreate;
}): Promise<IRedditCloneComment> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_clone_community_id: true,
    },
  });
  // Check if member is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: post.reddit_clone_community_id,
      member_id: props.member.id,
      lifted_at: null,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Validate parent_id if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
        select: {
          id: true,
          reddit_clone_post_id: true,
        },
      });
    // Ensure parent belongs to the same post
    if (parent.reddit_clone_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  // Create comment using collector
  const created = await MyGlobal.prisma.reddit_clone_comments.create({
    data: await RedditCloneCommentCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditClonePosts: { id: props.postId },
    }),
    ...RedditCloneCommentTransformer.select(),
  });
  return await RedditCloneCommentTransformer.transform(created);
}
