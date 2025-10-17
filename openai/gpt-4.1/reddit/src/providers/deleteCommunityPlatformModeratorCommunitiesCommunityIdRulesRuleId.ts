import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId, ruleId } = props;

  // 1. Check moderator is authorized for this community
  const mod = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      member_id: moderator.id,
      community_id: communityId,
      status: "active",
      deleted_at: null,
    },
  });
  if (!mod) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // 2. Find the rule in the community
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findUnique({
      where: { id: ruleId },
    });
  if (!rule || rule.community_id !== communityId) {
    throw new HttpException("Rule not found in the given community", 404);
  }

  // 3. Delete the rule (HARD DELETE)
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: { id: ruleId },
  });

  // 4. Write audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "moderator",
      actor_id: moderator.id,
      action_type: "delete",
      target_table: "community_platform_community_rules",
      target_id: ruleId,
      details: JSON.stringify({
        community_id: communityId,
        rule_id: ruleId,
        rule_version: rule.version,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
