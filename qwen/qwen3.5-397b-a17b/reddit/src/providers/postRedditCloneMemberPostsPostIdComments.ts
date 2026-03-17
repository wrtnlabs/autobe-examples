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
  // Validate post exists and get community_id for ban check
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      community_id: true,
    },
  });
  // Check if member is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      member_id: props.member.id,
      community_id: post.community_id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException(
      "Forbidden: You are banned from this community",
      403,
    );
  }
  // Validate parent_comment_id if provided
  if (
    props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: props.body.parent_comment_id },
        select: {
          id: true,
          reddit_clone_post_id: true,
        },
      });
    if (parentComment.reddit_clone_post_id !== props.postId) {
      throw new HttpException(
        "Bad Request: Parent comment belongs to a different post",
        400,
      );
    }
  }
  // Create comment using collector for data transformation
  const created = await MyGlobal.prisma.reddit_clone_comments.create({
    data: await RedditCloneCommentCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
      redditClonePosts: { id: props.postId },
    }),
    ...RedditCloneCommentTransformer.select(),
  });
  // Transform database result to response DTO
  return await RedditCloneCommentTransformer.transform(created);
}
