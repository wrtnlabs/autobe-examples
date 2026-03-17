import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdBansBanIdSnapshots(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanSnapshot.ICreate;
}): Promise<ICommunityPlatformCommunityBanSnapshot> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        community_platform_community_id: true,
        deleted_at: true,
      },
    });
  if (ban.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Ban does not belong to the specified community",
      400,
    );
  }
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban has been logically removed", 404);
  }
  throw new HttpException("Forbidden", 403);
}
