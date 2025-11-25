import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityMembersUsernameActivity(props: {
  username: string;
  body: IRedditCommunityGuest.IActivityRequest;
}): Promise<IPageIRedditCommunityGuest> {
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { username: props.username },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const contentType = props.body.content_type ?? "all";

  let totalPosts = 0;
  let totalComments = 0;
  let postKarma = 0;
  let commentKarma = 0;

  if (contentType === "posts" || contentType === "all") {
    totalPosts = await MyGlobal.prisma.reddit_community_posts.count({
      where: {
        reddit_community_member_id: member.id,
        ...(props.body.start_date || props.body.end_date
          ? {
              created_at: {
                ...(props.body.start_date && { gte: props.body.start_date }),
                ...(props.body.end_date && { lte: props.body.end_date }),
              },
            }
          : {}),
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }),
      },
    });

    const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
      where: {
        reddit_community_member_id: member.id,
        ...(props.body.start_date || props.body.end_date
          ? {
              created_at: {
                ...(props.body.start_date && { gte: props.body.start_date }),
                ...(props.body.end_date && { lte: props.body.end_date }),
              },
            }
          : {}),
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }),
      },
      select: { id: true },
    });

    if (posts.length > 0) {
      const postVotes =
        await MyGlobal.prisma.reddit_community_post_votes.groupBy({
          by: ["reddit_community_post_id"],
          where: {
            reddit_community_post_id: { in: posts.map((p) => p.id) },
          },
          _sum: {
            vote_type: true,
          },
        });

      postKarma = postVotes.reduce(
        (sum, v) => sum + ((v._sum && v._sum.vote_type) ?? 0),
        0,
      );
    }
  }

  if (contentType === "comments" || contentType === "all") {
    totalComments = await MyGlobal.prisma.reddit_community_comments.count({
      where: {
        reddit_community_member_id: member.id,
        ...(props.body.start_date || props.body.end_date
          ? {
              created_at: {
                ...(props.body.start_date && { gte: props.body.start_date }),
                ...(props.body.end_date && { lte: props.body.end_date }),
              },
            }
          : {}),
        ...(props.body.search && {
          body: { contains: props.body.search },
        }),
      },
    });

    const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        reddit_community_member_id: member.id,
        ...(props.body.start_date || props.body.end_date
          ? {
              created_at: {
                ...(props.body.start_date && { gte: props.body.start_date }),
                ...(props.body.end_date && { lte: props.body.end_date }),
              },
            }
          : {}),
        ...(props.body.search && {
          body: { contains: props.body.search },
        }),
      },
      select: { id: true },
    });

    if (comments.length > 0) {
      const commentVotes =
        await MyGlobal.prisma.reddit_community_comment_votes.groupBy({
          by: ["reddit_community_comment_id"],
          where: {
            reddit_community_comment_id: { in: comments.map((c) => c.id) },
          },
          _sum: {
            vote_type: true,
          },
        });

      commentKarma = commentVotes.reduce(
        (sum, v) => sum + ((v._sum && v._sum.vote_type) ?? 0),
        0,
      );
    }
  }

  const totalKarma = postKarma + commentKarma;

  const activityMetrics: IRedditCommunityGuest = {
    total_posts: totalPosts,
    total_comments: totalComments,
    post_karma: postKarma,
    comment_karma: commentKarma,
    total_karma: totalKarma,
  };

  return {
    data: [activityMetrics],
    pagination: {
      current: (props.body.page ?? 1) - 1,
      limit: props.body.limit ?? 100,
      records: 1,
      pages: 1,
    },
  };
}
