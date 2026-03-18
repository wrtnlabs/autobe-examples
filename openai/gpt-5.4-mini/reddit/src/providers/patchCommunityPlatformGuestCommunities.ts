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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestCommunities(props: {
  guest: GuestPayload;
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const where: Prisma.community_platform_communitiesWhereInput = search
    ? {
        deleted_at: null,
        status: "active",
        name: {
          contains: search,
          mode: "insensitive",
        },
      }
    : {
        id: "__no_results__",
      };
  const orderBy: Prisma.community_platform_communitiesOrderByWithRelationInput =
    props.body.sort === "new"
      ? { created_at: "desc" }
      : props.body.sort === "top"
        ? { created_at: "desc" }
        : props.body.sort === "controversial"
          ? { created_at: "desc" }
          : { name: "asc" };
  const records = await MyGlobal.prisma.community_platform_communities.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        icon_image_url: true,
        status: true,
        owner: {
          select: {
            id: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const recordsCount: number =
    await MyGlobal.prisma.community_platform_communities.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(records, async (record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      iconImageUrl: record.icon_image_url,
      status: record.status,
      owner: {},
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at: record.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    },
  };
}
