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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const feed: string = props.body.feed ?? "home";
  const sort: string = props.body.sort ?? "new";
  if (feed !== "home" && feed !== "popular" && feed !== "community") {
    throw new HttpException("Unsupported feed scope", 400);
  }
  if (
    sort !== "hot" &&
    sort !== "new" &&
    sort !== "top" &&
    sort !== "controversial"
  ) {
    throw new HttpException("Unsupported sort mode", 400);
  }
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
        subscription_status: "active",
      },
      select: {
        community_platform_community_id: true,
      },
    });
  const subscribedCommunityIds: string[] = subscriptions.map(
    (subscription) => subscription.community_platform_community_id,
  );
  const whereInput: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
      ...(props.body.communityId !== undefined
        ? { id: props.body.communityId }
        : {}),
      ...(props.body.communityName !== undefined
        ? { name: props.body.communityName }
        : {}),
      ...(feed === "home"
        ? {
            id: {
              in: subscribedCommunityIds,
            },
          }
        : {}),
    },
    ...(props.body.search !== undefined
      ? {
          title: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" }, { id: "desc" }]
      : sort === "top"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : sort === "controversial"
          ? [{ created_at: "desc" }, { id: "desc" }]
          : [{ created_at: "desc" }, { id: "desc" }];
  const total: number = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
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
          display_name: true,
          avatar_image_uri: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_image_url: true,
          status: true,
          owner: {
            select: {
              id: true,
              display_name: true,
              avatar_image_uri: true,
              karma: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      comments: {
        select: {
          id: true,
        },
        where: {
          deleted_at: null,
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
        },
      },
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: posts.map((post) => ({
      id: post.id,
      title: post.title,
      status: post.status,
      author: {
        id: post.author.id,
      } as ICommunityPlatformMember.ISummary,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        iconImageUrl: post.community.icon_image_url,
        status: post.community.status,
        owner: {
          id: post.community.owner.id,
        } as ICommunityPlatformMember.ISummary,
        created_at: post.community.created_at.toISOString(),
        updated_at: post.community.updated_at.toISOString(),
        deleted_at:
          post.community.deleted_at === null
            ? null
            : post.community.deleted_at.toISOString(),
      },
      voteScore: 0,
      commentCount: post.comments.length,
      createdAt: post.created_at.toISOString(),
      updatedAt: post.updated_at.toISOString(),
      deletedAt:
        post.deleted_at === null ? null : post.deleted_at.toISOString(),
    })),
  };
}
