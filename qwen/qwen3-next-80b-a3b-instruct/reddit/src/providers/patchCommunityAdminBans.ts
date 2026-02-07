import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminBans(props: {
  admin: AdminPayload;
  body: ICommunityBannedUser.IRequest;
}): Promise<IPageICommunityBannedUser> {
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Since IRequest is empty, no filtering parameters can be read from body
  // All filtering must be disabled or handled differently
  // Fetch all active bans (default behavior)
  const data = await MyGlobal.prisma.community_bans.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityBannedUserTransformer.select(),
  });
  // Count total active bans
  const total = await MyGlobal.prisma.community_bans.count({
    where: { deleted_at: null },
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityBannedUserTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
