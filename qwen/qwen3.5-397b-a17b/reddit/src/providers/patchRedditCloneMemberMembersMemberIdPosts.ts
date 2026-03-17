import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberMembersMemberIdPosts(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  const timeFilterDate = (() => {
    if (props.body.sort !== "top") {
      return undefined;
    }
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "this_week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "this_month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "this_year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case "all_time":
      default:
        return undefined;
    }
  })();
  const whereInput = {
    member_id: props.memberId,
    deleted_at: null,
    ...(props.body.search && {
      title: {
        contains: props.body.search,
      },
    }),
    ...(timeFilterDate && {
      created_at: {
        gte: timeFilterDate,
      },
    }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "new":
        return { created_at: "desc" as const };
      case "top":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "desc" as const };
      case "hot":
      default:
        return { created_at: "desc" as const };
    }
  })();
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      post_type: true,
      member: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          subscriber_count: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar: true,
              created_at: true,
            },
          },
        },
      },
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    const votes = await MyGlobal.prisma.reddit_clone_votes.groupBy({
      by: ["vote_type"],
      where: {
        target_type: "POST",
        target_id: post.id,
        deleted_at: null,
      },
      _count: {
        vote_type: true,
      },
    });
    let voteScoreValue = 0;
    for (const vote of votes) {
      if (vote.vote_type === "UPVOTE") {
        voteScoreValue += vote._count.vote_type;
      } else if (vote.vote_type === "DOWNVOTE") {
        voteScoreValue -= vote._count.vote_type;
      }
    }
    const commentCount = await MyGlobal.prisma.reddit_clone_comments.count({
      where: {
        reddit_clone_post_id: post.id,
        deleted_at: null,
      },
    });
    let preview = "";
    if (post.post_type === "TEXT") {
      const textContent =
        await MyGlobal.prisma.reddit_clone_post_texts.findFirst({
          where: { reddit_clone_post_id: post.id },
          select: { body: true },
        });
      preview = textContent?.body.substring(0, 200) ?? "";
    } else if (post.post_type === "IMAGE") {
      const imageContent =
        await MyGlobal.prisma.reddit_clone_post_images.findFirst({
          where: { reddit_clone_post_id: post.id },
          select: { file_uri: true },
        });
      preview = imageContent?.file_uri ?? "";
    } else if (post.post_type === "LINK") {
      const linkContent =
        await MyGlobal.prisma.reddit_clone_post_links.findFirst({
          where: { reddit_clone_post_id: post.id },
          select: { url: true },
        });
      if (linkContent?.url) {
        try {
          const urlObj = new URL(linkContent.url);
          preview = urlObj.hostname;
        } catch {
          preview = linkContent.url;
        }
      }
    }
    const karmaScore =
      await MyGlobal.prisma.reddit_clone_karma_scores.findFirst({
        where: { member_id: post.member.id },
        select: { score: true },
      });
    const ownerKarma =
      await MyGlobal.prisma.reddit_clone_karma_scores.findFirst({
        where: { member_id: post.community.owner.id },
        select: { score: true },
      });
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      post_type: post.post_type,
      author: {
        id: post.member.id as string & tags.Format<"uuid">,
        username: post.member.username,
        display_name: post.member.display_name,
        avatar: post.member.avatar ?? null,
        karma_score: karmaScore?.score ?? 0,
        created_at: toISOStringSafe(post.member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description,
        icon: post.community.icon ?? null,
        subscriber_count: post.community.subscriber_count,
        created_at: toISOStringSafe(post.community.created_at),
        owner: {
          id: post.community.owner.id as string & tags.Format<"uuid">,
          username: post.community.owner.username,
          display_name: post.community.owner.display_name,
          avatar: post.community.owner.avatar ?? null,
          karma_score: ownerKarma?.score ?? 0,
          created_at: toISOStringSafe(post.community.owner.created_at),
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      vote_score: voteScoreValue,
      comment_count: commentCount,
      created_at: toISOStringSafe(post.created_at),
      preview,
    } satisfies IRedditClonePost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditClonePost.ISummary;
}
