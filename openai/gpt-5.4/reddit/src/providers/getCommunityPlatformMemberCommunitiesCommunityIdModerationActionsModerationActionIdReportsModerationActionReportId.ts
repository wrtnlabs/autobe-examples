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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationActionReportTransformer } from "../transformers/CommunityPlatformModerationActionReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdReportsModerationActionReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  moderationActionReportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationActionReport> {
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
        revoked_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const moderationAction =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: {
        id: props.moderationActionId,
      },
      select: {
        id: true,
        community_platform_community_id: true,
        deleted_at: true,
      },
    });
  if (
    moderationAction === null ||
    moderationAction.community_platform_community_id !== props.communityId ||
    moderationAction.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }
  const moderationActionReport =
    await MyGlobal.prisma.community_platform_moderation_action_reports.findUnique(
      {
        where: {
          id: props.moderationActionReportId,
        },
        select: {
          id: true,
          community_platform_moderation_action_id: true,
          deleted_at: true,
          report: {
            select: {
              id: true,
              community_platform_community_id: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  if (
    moderationActionReport === null ||
    moderationActionReport.community_platform_moderation_action_id !==
      props.moderationActionId ||
    moderationActionReport.deleted_at !== null ||
    moderationActionReport.report.deleted_at !== null ||
    moderationActionReport.report.community_platform_community_id !==
      props.communityId
  ) {
    throw new HttpException("Not Found", 404);
  }
  const record =
    await MyGlobal.prisma.community_platform_moderation_action_reports.findUniqueOrThrow(
      {
        where: {
          id: props.moderationActionReportId,
        },
        ...CommunityPlatformModerationActionReportTransformer.select(),
      },
    );
  return await CommunityPlatformModerationActionReportTransformer.transform(
    record,
  );
}
