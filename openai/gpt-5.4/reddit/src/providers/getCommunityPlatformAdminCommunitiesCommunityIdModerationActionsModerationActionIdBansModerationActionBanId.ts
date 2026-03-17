import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationActionBanTransformer } from "../transformers/CommunityPlatformModerationActionBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdModerationActionsModerationActionIdBansModerationActionBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  moderationActionBanId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionBan> {
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_bans.findFirstOrThrow(
      {
        where: {
          id: props.moderationActionBanId,
          community_platform_moderation_action_id: props.moderationActionId,
          deleted_at: null,
          moderationAction: {
            deleted_at: null,
            community_platform_community_id: props.communityId,
            communityModerator: {
              deleted_at: null,
              community_platform_community_id: props.communityId,
              community_platform_member_id: props.admin.id,
              status: "active",
              revoked_at: null,
            },
          },
          communityBan: {
            deleted_at: null,
            community_platform_community_id: props.communityId,
          },
        },
        ...CommunityPlatformModerationActionBanTransformer.select(),
      },
    );
  const output =
    await CommunityPlatformModerationActionBanTransformer.transform(record);
  if (
    output.id !== props.moderationActionBanId ||
    output.moderationAction.id !== props.moderationActionId ||
    output.moderationAction.community.id !== props.communityId ||
    output.communityBan.community.id !== props.communityId
  ) {
    throw new HttpException("Not Found", 404);
  }
  return output;
}
