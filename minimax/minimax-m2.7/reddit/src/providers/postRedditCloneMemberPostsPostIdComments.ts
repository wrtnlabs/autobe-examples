import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
  // Step 1: Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Check if member is banned from the community
  const communityBan =
    await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
      where: {
        reddit_clone_community_id: post.reddit_clone_community_id,
        reddit_clone_member_id: props.member.id,
      },
    });
  if (communityBan !== null) {
    throw new HttpException(
      "You are banned from commenting in this community",
      403,
    );
  }
  // Step 3: If parentCommentId provided, verify it exists and belongs to the same post
  if (
    props.body.parentCommentId !== undefined &&
    props.body.parentCommentId !== null
  ) {
    const parentComment = await MyGlobal.prisma.reddit_clone_comments.findFirst(
      {
        where: {
          id: props.body.parentCommentId,
          reddit_clone_post_id: props.postId,
          deleted_at: null,
        },
      },
    );
    if (parentComment === null) {
      throw new HttpException(
        "Parent comment not found or does not belong to this post",
        404,
      );
    }
  }
  // Step 4: Generate comment ID upfront for direct lookup after create
  const commentId = v4();
  // Step 5: Create comment using collector
  await MyGlobal.prisma.reddit_clone_comments.create({
    data: await RedditCloneCommentCollector.collect({
      body: props.body,
      post: { id: props.postId },
      member: { id: props.member.id },
    }),
  });
  // Step 6: Increment post's comment_count
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: {
        increment: 1,
      },
    },
  });
  // Step 7: Fetch created comment with full relations for response using the generated ID
  const createdComment =
    await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
      where: { id: commentId },
      ...RedditCloneCommentTransformer.select(),
    });
  return await RedditCloneCommentTransformer.transform(createdComment);
}
