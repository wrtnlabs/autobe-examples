import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationActionTransformer } from "../transformers/CommunityPlatformModerationActionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationAction> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findFirstOrThrow(
      {
        where: {
          id: props.moderationActionId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
        ...CommunityPlatformModerationActionTransformer.select(),
      },
    );
  return await CommunityPlatformModerationActionTransformer.transform(
    moderationAction,
  );
}
