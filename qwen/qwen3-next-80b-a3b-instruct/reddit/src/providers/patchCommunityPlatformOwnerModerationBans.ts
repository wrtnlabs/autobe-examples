import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";

export async function patchCommunityPlatformOwnerModerationBans(props: {
  owner: OwnerPayload;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan> {
  // Build where clause with filters
  const where: any = {
    deleted_at: null,
  };
  if (props.body.community_id) {
    where.community_id = props.body.community_id;
  }
  if (props.body.banned_user_id) {
    where.banned_user_id = props.body.banned_user_id;
  }
  if (props.body.moderator_id) {
    where.moderator_id = props.body.moderator_id;
  }
  // Get cursor from request, if provided
  const cursor = props.body.cursor;
  const limit = props.body.limit ?? 20;
  // Fetch bans with related data using cursor-based pagination
  const bans = await MyGlobal.prisma.community_platform_bans.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: limit,
    // Use cursor (if provided) for pagination - must use unique identifier
    ...(cursor && { cursor: { id: cursor } }),
    ...CommunityPlatformBanTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.community_platform_bans.count({ where });
  // Transform using existing transformer
  const data = await Promise.all(
    bans.map(async (ban) => {
      return CommunityPlatformBanTransformer.transform(ban);
    }),
  );
  // Generate next cursor
  const nextCursor = bans.length > 0 ? bans[bans.length - 1].id : null;
  return {
    data,
    pagination: {
      current: 1, // Cursor-based pagination doesn't use traditional page numbers
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
