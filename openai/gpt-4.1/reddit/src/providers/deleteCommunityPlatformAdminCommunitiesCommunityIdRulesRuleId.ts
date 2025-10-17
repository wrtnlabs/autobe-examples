import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdRulesRuleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find target rule (must match both id and community_id)
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: props.ruleId,
        community_id: props.communityId,
      },
    });
  if (!rule) {
    throw new HttpException("Rule not found for the specified community", 404);
  }
  // Step 2: Hard delete (no soft delete field available)
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: { id: props.ruleId },
  });
  // Step 3: Audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "delete",
      target_table: "community_platform_community_rules",
      target_id: props.ruleId,
      details: JSON.stringify({
        community_id: props.communityId,
        deleted_rule_id: props.ruleId,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
