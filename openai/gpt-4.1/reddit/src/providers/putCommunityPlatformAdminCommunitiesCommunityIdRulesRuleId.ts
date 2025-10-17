import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminCommunitiesCommunityIdRulesRuleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  // 1. Find the targeted rule by ruleId and communityId (ensure WRITTEN BY ADMIN/OWNERSHIP)
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: props.ruleId,
        community_id: props.communityId,
      },
    });
  if (!rule) {
    throw new HttpException("Rule not found for the given community.", 404);
  }
  // Authorization: Only admin (platform) allowed here (already enforced by controller+decorator)

  // 2. Validation: new version must strictly increase
  if (props.body.version <= rule.version) {
    throw new HttpException(
      "Version must be strictly greater than the current rule version.",
      409,
    );
  }
  // 3. Validation: body must NOT exceed 50000 characters (defensive, though already validated)
  if (props.body.body.length > 50000) {
    throw new HttpException("Body text exceeds 50,000 character limit.", 400);
  }

  // 4. Update rule in DB
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: props.ruleId },
      data: {
        body: props.body.body,
        version: props.body.version,
        published_at: props.body.published_at,
        updated_at: now,
      },
    });
  // 5. Return result with correct mapping and required types
  return {
    id: updated.id,
    community_id: updated.community_id,
    body: updated.body,
    version: updated.version,
    published_at: toISOStringSafe(updated.published_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
