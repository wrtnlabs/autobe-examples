import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditCommunityPost.IUpdate;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      author_id: true,
      community_id: true,
      author: RedditCommunityMemberAtSummaryTransformer.select(),
      community: RedditCommunityCommunityAtSummaryTransformer.select(),
      _count: { select: { votes: true, comments: true } },
      votes: { select: {} },
      comments: { select: {} },
    },
  });
  if (post.author_id !== props.member.id) {
    const isModerator =
      await MyGlobal.prisma.reddit_community_moderators.findUnique({
        where: {
          user_id_community_id: {
            user_id: props.member.id,
            community_id: post.community_id,
          },
        },
      });
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const updateData: Record<string, any> = {};
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.url !== undefined) {
    updateData.url = props.body.url;
  }
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  updateData.updated_at = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  if (Object.keys(updateData).length === 0) {
    throw new HttpException("At least one field must be provided", 400);
  }
  const updated = await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Merge the updated fields into the original post object
  // This preserves all selected fields including votes, comments, and _count
  const merged = {
    ...post,
    ...updated,
  };
  // Pass total structure to transformer
  return RedditCommunityPostTransformer.transform(merged);
}
