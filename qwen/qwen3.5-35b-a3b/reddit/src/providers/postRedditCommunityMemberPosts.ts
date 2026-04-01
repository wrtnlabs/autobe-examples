import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostCollector } from "../collectors/RedditCommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const { community_id, post_type, title, body, url, fileId } = props.body;
  // Validate title length
  if (title.length < 1 || title.length > 300) {
    throw new HttpException("Title must be between 1 and 300 characters", 400);
  }
  // Validate post_type
  if (post_type !== "text" && post_type !== "link" && post_type !== "image") {
    throw new HttpException("Invalid post type", 400);
  }
  // Validate content based on post type
  if (post_type === "text" && (!body || body.length === 0)) {
    throw new HttpException("Text posts require body content", 400);
  }
  if (post_type === "link" && (!url || !isValidUrl(url))) {
    throw new HttpException("Link posts require a valid URL", 400);
  }
  if (post_type === "image" && !fileId) {
    throw new HttpException("Image posts require a file ID", 400);
  }
  // Verify community exists and member is subscribed
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: community_id,
        deleted_at: null,
      },
      include: {
        community: true,
      },
    });
  if (!subscription) {
    throw new HttpException("Not subscribed to this community", 400);
  }
  // For image posts, verify file exists and isn't already used
  if (post_type === "image" && fileId) {
    const existing =
      await MyGlobal.prisma.reddit_community_file_of_posts.findFirst({
        where: {
          reddit_community_file_id: fileId,
          deleted_at: null,
        },
      });
    if (existing) {
      throw new HttpException("File already used by another post", 409);
    }
    const file = await MyGlobal.prisma.reddit_community_files.findFirst({
      where: {
        id: fileId,
        deleted_at: null,
      },
    });
    if (!file) {
      throw new HttpException("File not found", 404);
    }
  }
  // Create post with content
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await RedditCommunityPostCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id } as any,
    });
    const post = await tx.reddit_community_posts.create({
      data,
      ...RedditCommunityPostTransformer.select(),
    });
    // Create snapshot
    await tx.reddit_community_post_snapshots.create({
      data: {
        id: v4(),
        reddit_community_post_id: post.id,
        edited_by_member_id: props.member.id,
        title: post.title,
        post_type: post.post_type,
        text_body: post_type === "text" ? body : null,
        link_url: post_type === "link" ? url : null,
        image_file_id: post_type === "image" ? fileId : null,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        created_at: new Date().toISOString(),
      },
    });
    return post;
  });
  return await RedditCommunityPostTransformer.transform(created);
}
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
