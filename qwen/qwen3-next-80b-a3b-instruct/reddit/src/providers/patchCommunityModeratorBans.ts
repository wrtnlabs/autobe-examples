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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityModeratorBans(props: {
  moderator: ModeratorPayload;
  body: ICommunityBannedUser.IRequest;
}): Promise<IPageICommunityBannedUser> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    // IRequest is currently empty - no filtering fields defined
    // Filtering by community_id, banned_user_id, banned_by_id, reason, status is not supported by IRequest definition
    // However, we still enforce soft-delete: only show active bans (deleted_at is null) unless overridden by request
    // But IRequest has no status field to override - therefore, only active bans (deleted_at: null) by default
    deleted_at: null,
  } satisfies Prisma.community_bansWhereInput;
  const data = await MyGlobal.prisma.community_bans.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    where: whereInput,
    ...CommunityBannedUserTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityBannedUserTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
