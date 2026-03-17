import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationActionCommentTransformer } from "../transformers/CommunityPlatformModerationActionCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdCommentsModerationActionCommentId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  moderationActionCommentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionComment> {
  const authorized =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (authorized === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_moderation_actions.findFirstOrThrow({
      where: {
        id: props.moderationActionId,
        community_platform_community_id: props.communityId,
      },
      select: {
        id: true,
      },
    });
    await prisma.community_platform_moderation_action_comments.findFirstOrThrow(
      {
        where: {
          id: props.moderationActionCommentId,
          community_platform_moderation_action_id: props.moderationActionId,
        },
        select: {
          id: true,
        },
      },
    );
    const record =
      await prisma.community_platform_moderation_action_comments.findFirstOrThrow(
        {
          where: {
            id: props.moderationActionCommentId,
            community_platform_moderation_action_id: props.moderationActionId,
            moderationAction: {
              community_platform_community_id: props.communityId,
            },
          },
          ...CommunityPlatformModerationActionCommentTransformer.select(),
        },
      );
    return await CommunityPlatformModerationActionCommentTransformer.transform(
      record,
    );
  });
}
