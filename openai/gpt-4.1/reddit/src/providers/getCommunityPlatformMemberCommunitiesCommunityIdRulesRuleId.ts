import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberCommunitiesCommunityIdRulesRuleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityRule> {
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: props.ruleId,
        community_id: props.communityId,
      },
    });
  if (!rule) {
    throw new HttpException("Rule not found", 404);
  }
  return {
    id: rule.id,
    community_id: rule.community_id,
    body: rule.body,
    version: rule.version,
    published_at: toISOStringSafe(rule.published_at),
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
  };
}
