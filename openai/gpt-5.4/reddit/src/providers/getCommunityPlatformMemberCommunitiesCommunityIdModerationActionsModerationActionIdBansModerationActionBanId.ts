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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationActionBanTransformer } from "../transformers/CommunityPlatformModerationActionBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBansModerationActionBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  moderationActionBanId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionBan> {
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUniqueOrThrow(
      {
        where: {
          id: props.moderationActionId,
        },
        select: {
          id: true,
          community_platform_community_id: true,
          deleted_at: true,
        },
      },
    );
  if (
    moderationAction.community_platform_community_id !== props.communityId ||
    moderationAction.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }
  const moderationActionBan =
    await MyGlobal.prisma.community_platform_moderation_action_bans.findUniqueOrThrow(
      {
        where: {
          id: props.moderationActionBanId,
        },
        select: {
          id: true,
          community_platform_moderation_action_id: true,
          deleted_at: true,
          communityBan: {
            select: {
              community_platform_community_id: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  if (
    moderationActionBan.community_platform_moderation_action_id !==
      props.moderationActionId ||
    moderationActionBan.deleted_at !== null ||
    moderationActionBan.communityBan.community_platform_community_id !==
      props.communityId ||
    moderationActionBan.communityBan.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_bans.findUniqueOrThrow(
      {
        where: {
          id: props.moderationActionBanId,
        },
        ...CommunityPlatformModerationActionBanTransformer.select(),
      },
    );
  return await CommunityPlatformModerationActionBanTransformer.transform(
    record,
  );
}
