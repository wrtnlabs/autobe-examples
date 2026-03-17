import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformProfiles(props: {
  body: ICommunityPlatformProfile.IRequest;
}): Promise<IPageICommunityPlatformProfile.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              display_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              bio: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.display_name !== undefined &&
    props.body.display_name.length !== 0
      ? {
          display_name: {
            contains: props.body.display_name,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.bio !== undefined && props.body.bio.length !== 0
      ? {
          bio: {
            contains: props.body.bio,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.community_platform_profilesWhereInput;
  const orderBy: Prisma.community_platform_profilesOrderByWithRelationInput[] =
    props.body.sort === "display_name_asc"
      ? [{ display_name: "asc" }, { id: "asc" }]
      : props.body.sort === "display_name_desc"
        ? [{ display_name: "desc" }, { id: "asc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }, { id: "asc" }]
          : props.body.sort === "created_at_desc"
            ? [{ created_at: "desc" }, { id: "asc" }]
            : props.body.sort === "updated_at_asc"
              ? [{ updated_at: "asc" }, { id: "asc" }]
              : [{ updated_at: "desc" }, { id: "asc" }];
  const profiles = await MyGlobal.prisma.community_platform_profiles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_profiles.count({
    where,
  });
  return {
    data: profiles.map(() => ({}) satisfies ICommunityPlatformProfile.ISummary),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
