import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunityBans(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Accessing community_id and user_id directly from body is wrong because they are not defined on ICreate
  // We'll destructure them from body to avoid TS errors only if these exist or reject if missing
  const communityId = (props.body as any).community_id;
  const userId = (props.body as any).user_id;
  if (typeof communityId !== "string" || typeof userId !== "string") {
    throw new HttpException(
      "Invalid community_id or user_id in request body.",
      400,
    );
  }
  // Check existence
  const existing =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_id: communityId,
        user_id: userId,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "A ban already exists for this user in the community.",
      409,
    );
  }
  // Prepare data for creation
  const createInput = await CommunityPlatformCommunityBanCollector.collect({
    body: props.body,
    community: { id: communityId },
    user: { id: userId },
  });
  // Create new record
  const created =
    await MyGlobal.prisma.community_platform_community_bans.create({
      data: createInput,
    });
  // Return result, carefully converting Dates to string with toISOStringSafe
  return {
    id: created.id,
    community_id: created.community_id,
    user_id: created.user_id,
    banned_at: toISOStringSafe(created.banned_at),
    unbanned_at:
      created.unbanned_at === null
        ? null
        : toISOStringSafe(created.unbanned_at),
    reason: created.reason === null ? null : created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
