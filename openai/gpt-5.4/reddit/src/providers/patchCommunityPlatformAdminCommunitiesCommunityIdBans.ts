import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
    },
    select: {
      id: true,
    },
  });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        status: "active",
        revoked_at: null,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
    lifted_at: null,
    status: props.body.status ?? "active",
    OR: [
      {
        expired_at: null,
      },
      {
        expired_at: {
          gt: new Date(),
        },
      },
    ],
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          reason: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.started_at !== undefined
      ? {
          started_at: {
            gte: props.body.started_at,
          },
        }
      : {}),
    ...(props.body.expired_at !== undefined
      ? props.body.expired_at === null
        ? {
            expired_at: null,
          }
        : {
            expired_at: {
              gte: props.body.expired_at,
            },
          }
      : {}),
    ...(props.body.updated_at !== undefined
      ? {
          updated_at: {
            gte: props.body.updated_at,
          },
        }
      : {}),
  } satisfies Prisma.community_platform_community_bansWhereInput;
  const orderBy: Prisma.community_platform_community_bansOrderByWithRelationInput[] =
    props.body.sort === "started_at_asc"
      ? [
          {
            started_at: "asc",
          },
          {
            id: "asc",
          },
        ]
      : props.body.sort === "started_at_desc"
        ? [
            {
              started_at: "desc",
            },
            {
              id: "desc",
            },
          ]
        : props.body.sort === "updated_at_asc"
          ? [
              {
                updated_at: "asc",
              },
              {
                id: "asc",
              },
            ]
          : props.body.sort === "updated_at_desc"
            ? [
                {
                  updated_at: "desc",
                },
                {
                  id: "desc",
                },
              ]
            : props.body.sort === "created_at_asc"
              ? [
                  {
                    created_at: "asc",
                  },
                  {
                    id: "asc",
                  },
                ]
              : props.body.sort === "created_at_desc"
                ? [
                    {
                      created_at: "desc",
                    },
                    {
                      id: "desc",
                    },
                  ]
                : props.body.sort === "expired_at_asc"
                  ? [
                      {
                        expired_at: "asc",
                      },
                      {
                        id: "asc",
                      },
                    ]
                  : props.body.sort === "expired_at_desc"
                    ? [
                        {
                          expired_at: "desc",
                        },
                        {
                          id: "desc",
                        },
                      ]
                    : [
                        {
                          started_at: "desc",
                        },
                        {
                          id: "desc",
                        },
                      ];
  const query = {
    where,
    orderBy,
    skip,
    take: limit,
    ...CommunityPlatformCommunityBanAtSummaryTransformer.select(),
  } satisfies Prisma.community_platform_community_bansFindManyArgs;
  const data =
    await MyGlobal.prisma.community_platform_community_bans.findMany(query);
  const total = await MyGlobal.prisma.community_platform_community_bans.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
