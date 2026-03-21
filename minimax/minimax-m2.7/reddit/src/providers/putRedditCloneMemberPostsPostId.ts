import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostLinkTransformer } from "../transformers/RedditClonePostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostLink.IUpdate;
}): Promise<IRedditClonePostLink> {
  // Fetch post to verify existence and check authorization
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_community_id: true,
      type: true,
    },
  });
  // Authorization: Check if the member is the author
  if (post.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      reddit_clone_community_id: post.reddit_clone_community_id,
    },
  });
  if (ban) {
    throw new HttpException("Forbidden", 403);
  }
  // Update post using transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Always update title and updated_at on reddit_clone_posts
    await tx.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        title: props.body.title,
        updated_at: new Date(),
      },
    });
    // Update content-specific table based on post type
    if (post.type === "text" && props.body.textBody !== undefined) {
      await tx.reddit_clone_post_text_contents.update({
        where: { reddit_clone_post_id: props.postId },
        data: { body: props.body.textBody },
      });
    } else if (post.type === "link" && props.body.linkUrl !== undefined) {
      await tx.reddit_clone_post_links.update({
        where: { reddit_clone_post_id: props.postId },
        data: { url: props.body.linkUrl },
      });
    } else if (post.type === "image" && props.body.imageFileId !== undefined) {
      await tx.reddit_clone_post_images.update({
        where: { reddit_clone_post_id: props.postId },
        data: { reddit_clone_file_id: props.body.imageFileId },
      });
    }
  });
  // Fetch updated post with full relations using transformer select
  const updatedPost =
    await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditClonePostLinkTransformer.select(),
    });
  // Transform to IRedditClonePostLink response using transformer
  return await RedditClonePostLinkTransformer.transform(updatedPost);
}
