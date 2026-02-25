import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // 1. Verify community exists (admin has system-wide access per analysis files)
  await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // 2. Verify target user exists
  await MyGlobal.prisma.community_platform_users.findFirstOrThrow({
    where: { id: props.body.user_id, deleted_at: null },
  });
  // 3. Check if active ban already exists (unique constraint)
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
        status: "active",
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 4. Create ban using collector (admin acts as moderator with system-wide permissions)
  const data = await CommunityPlatformCommunityBanCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
    communityPlatformModerators: { id: props.admin.id },
    communityPlatformModeratorSessions: { id: props.admin.session_id },
  });
  // 5. Create ban record with transformer select
  const created =
    await MyGlobal.prisma.community_platform_community_bans.create({
      data,
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  // 6. Return transformed response
  return await CommunityPlatformCommunityBanTransformer.transform(created);
}
