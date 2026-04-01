import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostImageCollector } from "../collectors/RedditCommunityPostImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostImageTransformer } from "../transformers/RedditCommunityPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.ICreate;
}): Promise<IRedditCommunityPostImage> {
  // Verify post exists and user is the author
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_community_member_id: true },
  });
  if (post.reddit_community_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You are not the author of this post",
      403,
    );
  }
  // Calculate next sort_order
  const maxSortOrder =
    await MyGlobal.prisma.reddit_community_post_images.findFirst({
      where: {
        reddit_community_post_id: props.postId,
        deleted_at: null,
      },
      orderBy: { sort_order: "desc" },
      select: { sort_order: true },
    });
  const nextSortOrder = (maxSortOrder?.sort_order ?? -1) + 1;
  // Create image record using collector
  const created = await MyGlobal.prisma.reddit_community_post_images.create({
    data: await RedditCommunityPostImageCollector.collect({
      body: props.body,
      redditCommunityPosts: { id: props.postId },
      sequence: nextSortOrder,
    }),
    ...RedditCommunityPostImageTransformer.select(),
  });
  // Transform and return
  return await RedditCommunityPostImageTransformer.transform(created);
}
