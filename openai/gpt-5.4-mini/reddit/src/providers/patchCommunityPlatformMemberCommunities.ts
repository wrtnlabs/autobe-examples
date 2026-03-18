import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function patchCommunityPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const where: Prisma.community_platform_communitiesWhereInput =
    search !== undefined
      ? search.length > 0
        ? {
            deleted_at: null,
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {
            deleted_at: null,
            id: undefined,
          }
      : {
          deleted_at: null,
        };
  const records: number =
    await MyGlobal.prisma.community_platform_communities.count({
      where,
    });
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
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
    });
  return {
    data: communities.map(
      (community) =>
        ({
          id: community.id,
          name: community.name,
          description: community.description,
          iconImageUrl: community.icon_image_url,
          status: community.status,
          owner: {
            id: community.owner.id,
          } as ICommunityPlatformMember.ISummary,
          created_at: community.created_at.toISOString(),
          updated_at: community.updated_at.toISOString(),
          deleted_at:
            community.deleted_at === null
              ? null
              : community.deleted_at.toISOString(),
        }) satisfies ICommunityPlatformCommunity.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
