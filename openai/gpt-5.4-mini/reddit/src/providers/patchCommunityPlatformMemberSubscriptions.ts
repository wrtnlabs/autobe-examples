import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
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

export async function patchCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    community_platform_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? {
          community: {
            is: {
              deleted_at: null,
              OR: [
                {
                  name: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
                {
                  status: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        }
      : {}),
  } satisfies Prisma.community_platform_community_subscriptionsWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "status"
        ? { subscription_status: "asc" }
        : { created_at: "desc" }
  ) satisfies Prisma.community_platform_community_subscriptionsOrderByWithRelationInput;
  const rows =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        subscription_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
                email: true,
                username: true,
                password_hash: true,
                display_name: true,
                bio: true,
                avatar_image_uri: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const records: number =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      member: {},
      community: {
        id: row.community.id,
        name: row.community.name,
        description: row.community.description,
        iconImageUrl: row.community.icon_image_url,
        status: row.community.status,
        owner: {
          id: row.community.owner.id,
          email: row.community.owner.email,
          username: row.community.owner.username,
          password_hash: row.community.owner.password_hash,
          display_name: row.community.owner.display_name,
          bio: row.community.owner.bio,
          avatar_image_uri: row.community.owner.avatar_image_uri,
          karma: row.community.owner.karma,
          created_at: row.community.owner.created_at.toISOString(),
          updated_at: row.community.owner.updated_at.toISOString(),
          deleted_at: row.community.owner.deleted_at?.toISOString() ?? null,
        },
        created_at: row.community.created_at.toISOString(),
        updated_at: row.community.updated_at.toISOString(),
        deleted_at: row.community.deleted_at?.toISOString() ?? null,
      },
      subscriptionStatus: row.subscription_status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at?.toISOString() ?? null,
    })),
  };
}
