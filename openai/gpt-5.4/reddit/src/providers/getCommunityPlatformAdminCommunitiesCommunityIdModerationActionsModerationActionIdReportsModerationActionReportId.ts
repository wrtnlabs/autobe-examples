import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformModerationActionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionReport";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationActionReportTransformer } from "../transformers/CommunityPlatformModerationActionReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdModerationActionsModerationActionIdReportsModerationActionReportId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  moderationActionReportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionReport> {
  await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
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
  await MyGlobal.prisma.community_platform_moderation_actions.findFirstOrThrow({
    where: {
      id: props.moderationActionId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_moderation_action_reports.findFirstOrThrow(
    {
      where: {
        id: props.moderationActionReportId,
        community_platform_moderation_action_id: props.moderationActionId,
        report: {
          community_platform_community_id: props.communityId,
        },
      },
      select: {
        id: true,
      },
    },
  );
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_reports.findFirstOrThrow(
      {
        where: {
          id: props.moderationActionReportId,
          community_platform_moderation_action_id: props.moderationActionId,
          report: {
            community_platform_community_id: props.communityId,
          },
        },
        ...CommunityPlatformModerationActionReportTransformer.select(),
      },
    );
  return await CommunityPlatformModerationActionReportTransformer.transform(
    record,
  );
}
