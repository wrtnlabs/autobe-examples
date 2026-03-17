import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            code: true,
            email: true,
            email_verified: true,
            status: true,
            last_signed_in_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_membersFindManyArgs,
        subscriptions: {
          where: {
            active: true,
            deleted_at: null,
          },
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
        created_at: true,
        updated_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active") {
    throw new HttpException(
      "Community is not available for public browsing",
      403,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "new";
  const currentIso = new Date().toISOString();
  const currentMillis = Date.parse(currentIso);
  const topPeriodLowerBound =
    sort !== "top"
      ? undefined
      : props.body.top_period === "today"
        ? new Date(currentMillis - 24 * 60 * 60 * 1000).toISOString()
        : props.body.top_period === "week"
          ? new Date(currentMillis - 7 * 24 * 60 * 60 * 1000).toISOString()
          : props.body.top_period === "month"
            ? new Date(currentMillis - 30 * 24 * 60 * 60 * 1000).toISOString()
            : props.body.top_period === "year"
              ? new Date(
                  currentMillis - 365 * 24 * 60 * 60 * 1000,
                ).toISOString()
              : undefined;
  const andConditions: Prisma.community_platform_postsWhereInput[] = [
    {
      community_platform_community_id: props.communityId,
      deleted_at: null,
      status: "active",
      community: {
        is: {
          deleted_at: null,
          status: "active",
        },
      },
    },
  ];
  if (props.body.search !== undefined) {
    andConditions.push({
      OR: [
        {
          title: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          textContent: {
            is: {
              body: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
              deleted_at: null,
            },
          },
        },
        {
          link: {
            is: {
              domain_display: {
                contains: props.body.search,
                mode: Prisma.QueryMode.insensitive,
              },
              deleted_at: null,
            },
          },
        },
        {
          community: {
            is: {
              OR: [
                {
                  title: {
                    contains: props.body.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  description: {
                    contains: props.body.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }
  if (props.body.author_code !== undefined) {
    andConditions.push({
      author: {
        is: {
          code: props.body.author_code,
          deleted_at: null,
        },
      },
    });
  }
  if (props.body.community_slug !== undefined) {
    andConditions.push({
      community: {
        is: {
          slug: props.body.community_slug,
        },
      },
    });
  }
  if (props.body.post_type !== undefined) {
    andConditions.push({
      post_type: props.body.post_type,
    });
  }
  if (
    props.body.created_from !== undefined ||
    props.body.created_to !== undefined
  ) {
    andConditions.push({
      created_at: {
        ...(props.body.created_from !== undefined
          ? { gte: new Date(props.body.created_from) }
          : {}),
        ...(props.body.created_to !== undefined
          ? { lte: new Date(props.body.created_to) }
          : {}),
      },
    });
  }
  if (
    props.body.updated_from !== undefined ||
    props.body.updated_to !== undefined
  ) {
    andConditions.push({
      updated_at: {
        ...(props.body.updated_from !== undefined
          ? { gte: new Date(props.body.updated_from) }
          : {}),
        ...(props.body.updated_to !== undefined
          ? { lte: new Date(props.body.updated_to) }
          : {}),
      },
    });
  }
  if (topPeriodLowerBound !== undefined) {
    andConditions.push({
      created_at: {
        gte: new Date(topPeriodLowerBound),
      },
    });
  }
  const whereInput = {
    AND: andConditions,
  } satisfies Prisma.community_platform_postsWhereInput;
  const postSelect = {
    id: true,
    title: true,
    post_type: true,
    status: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    author: {
      select: {
        id: true,
        code: true,
        email: true,
        email_verified: true,
        status: true,
        last_signed_in_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_membersFindManyArgs,
    community: {
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            code: true,
            email: true,
            email_verified: true,
            status: true,
            last_signed_in_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_membersFindManyArgs,
        subscriptions: {
          where: {
            active: true,
            deleted_at: null,
          },
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs,
    votes: {
      where: {
        deleted_at: null,
      },
      select: {
        direction: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_votesFindManyArgs,
    comments: {
      where: {
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs,
    textContent: {
      select: {
        id: true,
        body: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_textsFindManyArgs,
    link: {
      select: {
        id: true,
        target_url: true,
        domain_display: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_linksFindManyArgs,
    postImage: {
      select: {
        id: true,
        storage_uri: true,
        original_name: true,
        mime_type: true,
        byte_size: true,
        width: true,
        height: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_post_imagesFindManyArgs,
  } satisfies Prisma.community_platform_postsSelect;
  const mapSummary = async (
    input: Prisma.community_platform_postsGetPayload<{
      select: typeof postSelect;
    }>,
  ): Promise<ICommunityPlatformPost.ISummary> => {
    const voteCount = input.votes.reduce((acc, vote) => {
      if (vote.deleted_at !== null) return acc;
      if (vote.direction === "upvote") return acc + 1;
      if (vote.direction === "downvote") return acc - 1;
      return acc;
    }, 0);
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      status: input.status,
      author: {
        id: input.author.id,
        code: input.author.code,
        email: input.author.email,
        email_verified: input.author.email_verified,
        status: input.author.status,
        last_signed_in_at:
          input.author.last_signed_in_at?.toISOString() ?? null,
        created_at: input.author.created_at.toISOString(),
        updated_at: input.author.updated_at.toISOString(),
        deleted_at: input.author.deleted_at?.toISOString() ?? null,
      } satisfies ICommunityPlatformMember.ISummary,
      community: {
        id: input.community.id,
        slug: input.community.slug,
        title: input.community.title,
        description: input.community.description,
        status: input.community.status,
        member: {
          id: input.community.member.id,
          code: input.community.member.code,
          email: input.community.member.email,
          email_verified: input.community.member.email_verified,
          status: input.community.member.status,
          last_signed_in_at:
            input.community.member.last_signed_in_at?.toISOString() ?? null,
          created_at: input.community.member.created_at.toISOString(),
          updated_at: input.community.member.updated_at.toISOString(),
          deleted_at: input.community.member.deleted_at?.toISOString() ?? null,
        } satisfies ICommunityPlatformMember.ISummary,
        subscriber_count: input.community.subscriptions.length,
        created_at: input.community.created_at.toISOString(),
        updated_at: input.community.updated_at.toISOString(),
        deleted_at: input.community.deleted_at?.toISOString() ?? null,
      } satisfies ICommunityPlatformCommunity.ISummary,
      vote_count: voteCount,
      comment_count: input.comments.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies ICommunityPlatformPost.ISummary;
  };
  if (sort === "new") {
    const data = await MyGlobal.prisma.community_platform_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: postSelect,
    });
    const total = await MyGlobal.prisma.community_platform_posts.count({
      where: whereInput,
    });
    return {
      data: await ArrayUtil.asyncMap(data, mapSummary),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  const rows = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: postSelect,
  });
  const summaries = await ArrayUtil.asyncMap(rows, mapSummary);
  const rankTop = (summary: ICommunityPlatformPost.ISummary): number =>
    summary.vote_count;
  const rankControversial = (
    summary: ICommunityPlatformPost.ISummary,
  ): number => {
    const upDownBalancePenalty = Math.abs(summary.vote_count) + 1;
    const engagement = Math.abs(summary.vote_count) + summary.comment_count;
    return engagement / upDownBalancePenalty;
  };
  const rankHot = (summary: ICommunityPlatformPost.ISummary): number => {
    const createdMillis = Date.parse(summary.created_at);
    const ageHours = Math.max(
      1,
      (currentMillis - createdMillis) / (1000 * 60 * 60),
    );
    const engagement = summary.vote_count * 2 + summary.comment_count;
    return engagement / ageHours;
  };
  const ranked = [...summaries].sort((left, right) => {
    const leftCreated = Date.parse(left.created_at);
    const rightCreated = Date.parse(right.created_at);
    const score =
      sort === "top"
        ? rankTop(right) - rankTop(left)
        : sort === "controversial"
          ? rankControversial(right) - rankControversial(left)
          : rankHot(right) - rankHot(left);
    if (score !== 0) return score;
    if (rightCreated !== leftCreated) return rightCreated - leftCreated;
    return right.id.localeCompare(left.id);
  });
  return {
    data: ranked.slice(skip, skip + limit),
    pagination: {
      current: page,
      limit,
      records: ranked.length,
      pages: ranked.length === 0 ? 0 : Math.ceil(ranked.length / limit),
    } satisfies IPage.IPagination,
  };
}
