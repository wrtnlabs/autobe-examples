import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the moderator exists and is active
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  // Verify the community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  // Verify moderator authorization for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findFirst({
      where: {
        assigned_user_id: props.moderator.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (moderatorAssignment === null) {
    throw new HttpException(
      "Not authorized to manage rules in this community",
      403,
    );
  }
  // Verify the rule exists and belongs to the specified community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findUniqueOrThrow({
      where: {
        id: props.ruleId,
        community_platform_community_id: props.communityId,
      },
    });
  // Perform hard delete operation
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: { id: props.ruleId },
  });
}
