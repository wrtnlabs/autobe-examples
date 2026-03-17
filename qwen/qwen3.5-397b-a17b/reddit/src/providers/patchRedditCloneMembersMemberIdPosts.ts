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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMembersMemberIdPosts(props: {
  memberId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: props.memberId },
  });
  const timeFilterWhere = (() => {
    if (props.body.sort !== "top" || !props.body.timeFilter) {
      return {};
    }
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        return {
          created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        };
      case "this_week":
        return {
          created_at: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
      case "this_month":
        return {
          created_at: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
      case "this_year":
        return {
          created_at: {
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        };
      case "all_time":
      default:
        return {};
    }
  })();
  const whereInput = {
    member_id: props.memberId,
    deleted_at: null,
    ...(props.body.search && {
      title: { contains: props.body.search },
    }),
    ...timeFilterWhere,
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "new":
        return { created_at: "desc" as const };
      case "hot":
        return { created_at: "desc" as const };
      case "top":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.reddit_clone_postsOrderByWithRelationInput;
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
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
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    const votes = await MyGlobal.prisma.reddit_clone_votes.findMany({
      where: {
        target_type: "POST",
        target_id: post.id,
        deleted_at: null,
      },
      select: { vote_type: true },
    });
    const vote_score = votes.reduce((acc, vote) => {
      if (vote.vote_type === "UPVOTE") return acc + 1;
      if (vote.vote_type === "DOWNVOTE") return acc - 1;
      return acc;
    }, 0);
    const comment_count = await MyGlobal.prisma.reddit_clone_comments.count({
      where: {
        reddit_clone_post_id: post.id,
        deleted_at: null,
      },
    });
    let preview = "";
    if (post.post_type === "TEXT") {
      const text = await MyGlobal.prisma.reddit_clone_post_texts.findUnique({
        where: { reddit_clone_post_id: post.id },
        select: { body: true },
      });
      preview = text?.body.substring(0, 200) ?? "";
    } else if (post.post_type === "IMAGE") {
      const image = await MyGlobal.prisma.reddit_clone_post_images.findUnique({
        where: { reddit_clone_post_id: post.id },
        select: { file_uri: true },
      });
      preview = image?.file_uri ?? "";
    } else if (post.post_type === "LINK") {
      const link = await MyGlobal.prisma.reddit_clone_post_links.findUnique({
        where: { reddit_clone_post_id: post.id },
        select: { url: true },
      });
      try {
        const urlObj = new URL(link?.url ?? "");
        preview = urlObj.hostname;
      } catch {
        preview = "";
      }
    }
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      author: {
        id: post.member.id,
        username: post.member.username,
        display_name: post.member.display_name,
        avatar: post.member.avatar ?? null,
        karma_score: 0,
        created_at: toISOStringSafe(post.member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        icon: post.community.icon ?? null,
        subscriber_count: post.community.subscriber_count,
        created_at: toISOStringSafe(post.community.created_at),
        owner: {
          id: post.community.owner.id,
          username: post.community.owner.username,
          display_name: post.community.owner.display_name,
          avatar: post.community.owner.avatar ?? null,
          karma_score: 0,
          created_at: toISOStringSafe(post.community.owner.created_at),
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      vote_score: vote_score,
      comment_count: comment_count,
      created_at: toISOStringSafe(post.created_at),
      preview: preview,
    } satisfies IRedditClonePost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditClonePost.ISummary;
}
