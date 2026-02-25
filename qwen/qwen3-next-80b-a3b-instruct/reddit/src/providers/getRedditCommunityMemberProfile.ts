import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function convertDates(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return toISOStringSafe(obj);
  if (Array.isArray(obj)) return obj.map(convertDates);
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertDates(obj[key]);
    }
  }
  return result;
}
export async function getRedditCommunityMemberProfile(props: {
  member: MemberPayload;
}): Promise<IRedditCommunityMember.IProfile> {
  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        is_deleted: true,
      },
    });
  if (member.is_deleted) {
    throw new HttpException("User account is deactivated", 404);
  }
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: {
      author_id: props.member.id,
      is_deleted: false,
    },
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      url: true,
      image_url: true,
      author: RedditCommunityMemberAtSummaryTransformer.select(),
      community: RedditCommunityCommunityAtSummaryTransformer.select(),
    },
  });
  // Recursively convert all Date fields in posts and their nested structures
  const postsWithSafeDates = posts.map((post) => convertDates(post));
  const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: {
      author_id: props.member.id,
    },
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      author: RedditCommunityMemberAtSummaryTransformer.select(),
    },
  });
  // Recursively convert all Date fields in comments and their nested structures
  const commentsWithSafeDates = comments.map((comment) =>
    convertDates(comment),
  );
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? undefined,
    avatar_url: member.avatar_url ?? undefined,
    karma_score: Number(member.karma_score),
    posts: await ArrayUtil.asyncMap(
      postsWithSafeDates,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
    comments: await ArrayUtil.asyncMap(
      commentsWithSafeDates,
      RedditCommunityCommentAtSummaryTransformer.transform,
    ),
  };
}
