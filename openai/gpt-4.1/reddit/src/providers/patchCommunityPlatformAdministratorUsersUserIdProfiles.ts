import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IPageICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorUsersUserIdProfiles(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserProfile.IRequest;
}): Promise<IPageICommunityPlatformUserProfile.ISummary> {
  // Prepare filter and paging values
  const {
    status,
    username,
    created_after,
    created_before,
    updated_after,
    updated_before,
    page = 0,
    limit = 100,
    sort,
  } = props.body;

  // Compose where clause for Prisma
  const where = {
    community_platform_user_id: props.userId,
    ...(typeof status === "string" && status.length > 0 && { status }),
    ...(typeof username === "string" &&
      username.length > 0 && { display_username: { contains: username } }),
    ...(created_after && { created_at: { gte: created_after } }),
    ...(created_before && {
      created_at: {
        ...(created_after ? { gte: created_after } : {}),
        lte: created_before,
      },
    }),
    ...(updated_after && { updated_at: { gte: updated_after } }),
    ...(updated_before && {
      updated_at: {
        ...(updated_after ? { gte: updated_after } : {}),
        lte: updated_before,
      },
    }),
  };

  // Determine correct sort ordering
  let orderBy: any = { created_at: "desc" };
  if (sort) {
    if (sort.includes(" ")) {
      const [col, dir] = sort.split(" ");
      orderBy = { [col]: dir.toLowerCase() === "desc" ? "desc" : "asc" };
    } else {
      orderBy = { [sort]: "asc" };
    }
  }

  // Query with filter/pagination
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_profiles.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        community_platform_user_id: true,
        display_username: true,
        avatar_uri: true,
        status: true,
      },
    }),
    MyGlobal.prisma.community_platform_user_profiles.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      community_platform_user_id: r.community_platform_user_id,
      display_username: r.display_username,
      avatar_uri: typeof r.avatar_uri === "string" ? r.avatar_uri : undefined,
      status: r.status,
    })),
  };
}
