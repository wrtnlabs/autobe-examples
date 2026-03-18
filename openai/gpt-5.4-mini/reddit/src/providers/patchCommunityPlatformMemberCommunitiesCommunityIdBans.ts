import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
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

export async function patchCommunityPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.community_platform_bansWhereInput = {
    community_platform_community_id: props.communityId,
    deleted_at: props.body.isActive === false ? undefined : null,
    ...(props.body.isActive === true
      ? {
          ended_at: null,
        }
      : props.body.isActive === false
        ? {
            OR: [{ ended_at: { not: null } }, { deleted_at: { not: null } }],
          }
        : {}),
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              member: {
                OR: [
                  {
                    email: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    username: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    display_name: {
                      contains: props.body.search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          ],
        }),
  };
  const total: number = await MyGlobal.prisma.community_platform_bans.count({
    where,
  });
  const records = await MyGlobal.prisma.community_platform_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "old"
        ? { created_at: "asc" }
        : { created_at: "desc" },
    select: {
      id: true,
      member: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
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
          owner_id: true,
          name: true,
          description: true,
          icon_image_url: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reason: true,
      started_at: true,
      ended_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    data: records.map(
      (record): ICommunityPlatformBan.ISummary => ({
        id: record.id,
        member: {
          id: record.member.id,
          email: record.member.email,
          username: record.member.username,
          display_name: record.member.display_name,
          bio: record.member.bio,
          avatar_image_uri: record.member.avatar_image_uri,
          karma: record.member.karma,
          created_at: record.member.created_at.toISOString(),
          updated_at: record.member.updated_at.toISOString(),
          deleted_at:
            record.member.deleted_at === null
              ? null
              : record.member.deleted_at.toISOString(),
        },
        community: {
          id: record.community.id,
          name: record.community.name,
          description: record.community.description,
          iconImageUrl: record.community.icon_image_url,
          status: record.community.status,
          owner: {
            id: record.community.owner_id,
          },
          created_at: record.community.created_at.toISOString(),
          updated_at: record.community.updated_at.toISOString(),
          deleted_at:
            record.community.deleted_at === null
              ? null
              : record.community.deleted_at.toISOString(),
        },
        reason: record.reason,
        started_at: record.started_at.toISOString(),
        ended_at:
          record.ended_at === null ? null : record.ended_at.toISOString(),
        created_at: record.created_at.toISOString(),
        updated_at: record.updated_at.toISOString(),
        deleted_at:
          record.deleted_at === null ? null : record.deleted_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
