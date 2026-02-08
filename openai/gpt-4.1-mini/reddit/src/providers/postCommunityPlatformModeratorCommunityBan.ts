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

export async function postCommunityPlatformModeratorCommunityBan(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Extract community_id and user_id safely with type guards
  if (typeof (props.body as any).community_id !== "string") {
    throw new HttpException("Invalid body: missing community_id", 400);
  }
  if (typeof (props.body as any).user_id !== "string") {
    throw new HttpException("Invalid body: missing user_id", 400);
  }
  const communityId = (props.body as any).community_id as string;
  const userId = (props.body as any).user_id as string;
  const existing =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: {
        community_id_user_id: {
          community_id: communityId,
          user_id: userId,
        },
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException(
      "This user is already banned in the community",
      400,
    );
  }
  const data = await CommunityPlatformCommunityBanCollector.collect({
    body: props.body,
    community: { id: communityId },
    user: { id: userId },
  });
  const created =
    await MyGlobal.prisma.community_platform_community_bans.create({ data });
  function toUuidString(value: unknown): string & tags.Format<"uuid"> {
    if (typeof value === "string") return value;
    throw new Error("Invalid UUID string");
  }
  return {
    id: toUuidString(created.id),
    community_id: toUuidString(created.community_id),
    user_id: toUuidString(created.user_id),
    banned_at: toISOStringSafe(created.banned_at)!,
    unbanned_at:
      created.unbanned_at === null
        ? null
        : toISOStringSafe(created.unbanned_at),
    reason: created.reason === null ? null : created.reason,
    created_at: toISOStringSafe(created.created_at)!,
    updated_at: toISOStringSafe(created.updated_at)!,
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
