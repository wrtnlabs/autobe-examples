import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

export async function getRedditCommunityCommunitiesCommunityNameRulesRuleId(props: {
  communityName: string;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityRule> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  const rule =
    await MyGlobal.prisma.reddit_community_community_rules.findUnique({
      where: { id: props.ruleId },
    });

  if (!rule || rule.community_id !== community.id) {
    throw new HttpException("Rule not found", 404);
  }

  return {
    id: rule.id,
    community_id: rule.community_id,
    title: rule.title,
    description: rule.description === null ? undefined : rule.description,
    rule_number: rule.rule_number,
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
  };
}
