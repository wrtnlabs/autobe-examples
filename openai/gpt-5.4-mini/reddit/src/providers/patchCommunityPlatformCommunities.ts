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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_communities.findMany({
    where: {
      deleted_at: null,
      ...(props.body.search !== undefined && props.body.search.length > 0
        ? {
            name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      icon_image_url: true,
      status: true,
      owner: {
        select: {},
      },
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records: number =
    await MyGlobal.prisma.community_platform_communities.count({
      where: {
        deleted_at: null,
        ...(props.body.search !== undefined && props.body.search.length > 0
          ? {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            }
          : {}),
      },
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      iconImageUrl: record.icon_image_url,
      status: record.status,
      owner: {},
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
  };
}
