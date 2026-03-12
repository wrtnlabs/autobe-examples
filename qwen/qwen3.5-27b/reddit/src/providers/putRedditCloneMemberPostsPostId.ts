import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IUpdate;
}): Promise<IRedditClonePost> {
  // Find the post and verify ownership
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
    },
    select: {
      id: true,
      reddit_clone_members_id: true,
      deleted_at: true,
      title: true,
      content: true,
      post_type: true,
      score: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Verify the member is the author
  if (post.reddit_clone_members_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the post is not deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  // Create a snapshot before modification
  await MyGlobal.prisma.reddit_clone_post_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_clone_post_id: props.postId,
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      link_url: null,
      file_url: null,
      score: post.score,
      original_created_at: post.created_at,
      original_updated_at: post.updated_at,
      original_deleted_at: post.deleted_at,
      captured_at: new Date(),
    },
  });
  // Update the post
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: {
      id: props.postId,
    },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  // Return the updated post with full details
  const updated = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
    },
    ...RedditClonePostTransformer.select(),
  });
  return await RedditClonePostTransformer.transform(updated);
}
