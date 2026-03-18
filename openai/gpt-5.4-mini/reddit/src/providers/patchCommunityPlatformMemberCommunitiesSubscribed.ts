import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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

export async function patchCommunityPlatformMemberCommunitiesSubscribed(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.length > 0
      ? props.body.search
      : undefined;
  const sort: string | undefined = props.body.sort;
  const where: Prisma.community_platform_community_subscriptionsWhereInput = {
    community_platform_member_id: props.member.id,
    deleted_at: null,
    subscription_status: "active",
    community: {
      is: {
        deleted_at: null,
        ...(search !== undefined
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
    },
  };
  const orderBy: Prisma.community_platform_community_subscriptionsOrderByWithRelationInput =
    sort === "oldest"
      ? {
          created_at: "asc",
        }
      : sort === "name"
        ? {
            community: {
              name: "asc",
            },
          }
        : {
            created_at: "desc",
          };
  const records =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
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
      },
    });
  const total: number =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where,
    });
  return {
    data: records.map((record) => ({
      id: record.community.id,
      name: record.community.name,
      description: record.community.description,
      iconImageUrl: record.community.icon_image_url,
      status: record.community.status,
      owner: {
        id: record.community.owner.id,
      },
      created_at: toISOStringSafe(record.community.created_at),
      updated_at: toISOStringSafe(record.community.updated_at),
      deleted_at:
        record.community.deleted_at === null
          ? null
          : toISOStringSafe(record.community.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
