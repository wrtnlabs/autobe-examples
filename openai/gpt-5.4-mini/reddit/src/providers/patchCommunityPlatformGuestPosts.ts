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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestPosts(props: {
  guest: GuestPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  if (props.body.feed === "home")
    throw new HttpException("Guest callers cannot access home feed", 403);
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "hot" &&
    props.body.sort !== "new" &&
    props.body.sort !== "top" &&
    props.body.sort !== "controversial"
  ) {
    throw new HttpException("Unsupported sort option", 400);
  }
  if (
    props.body.feed !== undefined &&
    props.body.feed !== "popular" &&
    props.body.feed !== "community"
  ) {
    throw new HttpException("Unsupported feed option", 400);
  }
  if (props.body.topWindow !== undefined && props.body.sort !== "top") {
    throw new HttpException("topWindow can only be used with top sorting", 400);
  }
  const communityWhere: Prisma.community_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.communityId !== undefined
      ? { id: props.body.communityId }
      : {}),
    ...(props.body.communityName !== undefined
      ? { name: props.body.communityName }
      : {}),
  };
  const communityMatch: {
    id: string;
    name: string;
    description: string;
    icon_image_url: string;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: Date | null;
  }[] =
    props.body.communityId !== undefined ||
    props.body.communityName !== undefined
      ? (
          await MyGlobal.prisma.community_platform_communities.findMany({
            where: communityWhere,
            select: {
              id: true,
              name: true,
              description: true,
              icon_image_url: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          })
        ).map((community) => ({
          id: community.id,
          name: community.name,
          description: community.description,
          icon_image_url: community.icon_image_url,
          status: community.status,
          created_at: toISOStringSafe(community.created_at),
          updated_at: toISOStringSafe(community.updated_at),
          deleted_at: community.deleted_at,
        }))
      : [];
  if (
    (props.body.communityId !== undefined ||
      props.body.communityName !== undefined) &&
    communityMatch.length === 0
  ) {
    throw new HttpException("Community not found", 404);
  }
  const communityIds: string[] = communityMatch.map(
    (community) => community.id,
  );
  const where: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.feed === "community" ||
    props.body.communityId !== undefined ||
    props.body.communityName !== undefined
      ? { community_platform_community_id: { in: communityIds } }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              text: {
                body: { contains: props.body.search, mode: "insensitive" },
              },
            },
            {
              link: {
                title: { contains: props.body.search, mode: "insensitive" },
              },
            },
            {
              link: {
                domain_name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
            {
              image: {
                image_alt_text: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const records: number = await MyGlobal.prisma.community_platform_posts.count({
    where,
  });
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_image_url: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
            },
          },
        },
      },
      text: {
        select: {
          body: true,
        },
      },
      link: {
        select: {
          url: true,
          domain_name: true,
          title: true,
        },
      },
      image: {
        select: {
          image_url: true,
          image_alt_text: true,
          presentation_width: true,
          presentation_height: true,
        },
      },
    },
  });
  const postIds: string[] = posts.map((post) => post.id);
  const voteRows =
    postIds.length === 0
      ? []
      : await MyGlobal.prisma.community_platform_votes.findMany({
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            direction: true,
            created_at: true,
          },
        });
  const commentRows =
    postIds.length === 0
      ? []
      : await MyGlobal.prisma.community_platform_comments.findMany({
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            community_platform_post_id: true,
          },
        });
  const voteScoreByPostId: Record<string, number> = {};
  const commentCountByPostId: Record<string, number> = {};
  for (const postId of postIds) {
    voteScoreByPostId[postId] = 0;
    commentCountByPostId[postId] = 0;
  }
  for (const row of voteRows) {
    void row;
  }
  for (const row of commentRows) {
    commentCountByPostId[row.community_platform_post_id] =
      (commentCountByPostId[row.community_platform_post_id] ?? 0) + 1;
  }
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: posts.map(
      (post) =>
        ({
          id: post.id,
          title: post.title,
          status: post.status,
          author: {
            id: post.author.id,
          } satisfies ICommunityPlatformMember.ISummary,
          community: {
            id: post.community.id,
            name: post.community.name,
            description: post.community.description,
            iconImageUrl: post.community.icon_image_url,
            status: post.community.status,
            owner: {
              id: post.community.owner.id,
            } satisfies ICommunityPlatformMember.ISummary,
            created_at: toISOStringSafe(post.community.created_at),
            updated_at: toISOStringSafe(post.community.updated_at),
            deleted_at:
              post.community.deleted_at === null
                ? null
                : toISOStringSafe(post.community.deleted_at),
          } satisfies ICommunityPlatformCommunity.ISummary,
          voteScore: voteScoreByPostId[post.id] ?? 0,
          commentCount: commentCountByPostId[post.id] ?? 0,
          createdAt: toISOStringSafe(post.created_at),
          updatedAt: toISOStringSafe(post.updated_at),
          deletedAt:
            post.deleted_at === null ? null : toISOStringSafe(post.deleted_at),
        }) satisfies ICommunityPlatformPost.ISummary,
    ),
  };
}
