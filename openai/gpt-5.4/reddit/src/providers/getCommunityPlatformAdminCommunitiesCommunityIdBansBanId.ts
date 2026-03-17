import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException("Forbidden", 403);
  }
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findFirstOrThrow({
      where: {
        id: props.banId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  return await CommunityPlatformCommunityBanTransformer.transform(ban);
}
