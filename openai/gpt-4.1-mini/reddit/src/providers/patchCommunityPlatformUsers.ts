import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUsers(props: {
  body: ICommunityPlatformUser.IRequest;
}): Promise<IPageICommunityPlatformUser.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_users.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      username: true,
      display_name: true,
      avatar_url: true,
      karma: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_users.count();
  return {
    data: data.map((user) => ({
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url === null ? null : user.avatar_url,
      karma: user.karma,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
