import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function getCommunityPlatformCommunitiesCommunityNameRulesRuleCode(props: {
  communityName: string;
  ruleCode: string;
}): Promise<ICommunityPlatformCommunityRule> {
  // Step 1: Lookup the parent community by name (unique slug)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Step 2: Find the rule by community id and code (composite unique)
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findUnique({
      where: {
        community_platform_community_id_code: {
          community_platform_community_id: community.id,
          code: props.ruleCode,
        },
      },
    });
  if (!rule) {
    throw new HttpException("Rule not found", 404);
  }

  // Step 3: Map to ICommunityPlatformCommunityRule DTO
  return {
    id: rule.id,
    code: rule.code,
    description: rule.description,
    display_order: rule.display_order,
    enforced: rule.enforced,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url: community.image_url ?? undefined,
      status: community.status,
    },
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
  };
}
