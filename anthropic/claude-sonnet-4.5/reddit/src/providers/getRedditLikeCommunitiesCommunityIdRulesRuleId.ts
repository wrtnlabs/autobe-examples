import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";

export async function getRedditLikeCommunitiesCommunityIdRulesRuleId(props: {
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityRule> {
  const { communityId, ruleId } = props;

  const rule = await MyGlobal.prisma.reddit_like_community_rules.findFirst({
    where: {
      id: ruleId,
      community_id: communityId,
    },
  });

  if (!rule) {
    throw new HttpException(
      "Community rule not found or does not belong to the specified community",
      404,
    );
  }

  return {
    id: rule.id,
    community_id: rule.community_id,
    title: rule.title,
    description: rule.description ?? undefined,
    rule_type: rule.rule_type,
    display_order: Number(rule.display_order),
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
  };
}
