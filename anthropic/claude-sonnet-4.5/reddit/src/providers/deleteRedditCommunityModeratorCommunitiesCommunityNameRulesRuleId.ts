import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorCommunitiesCommunityNameRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  ruleId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityRule> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const moderatorRecord =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (!moderatorRecord) {
    throw new HttpException(
      "You do not have moderator authority over this community",
      403,
    );
  }

  const rule = await MyGlobal.prisma.reddit_community_community_rules.findFirst(
    {
      where: {
        id: props.ruleId,
        community_id: community.id,
      },
    },
  );

  if (!rule) {
    throw new HttpException("Rule not found in this community", 404);
  }

  const deletedRule =
    await MyGlobal.prisma.reddit_community_community_rules.delete({
      where: {
        id: props.ruleId,
      },
    });

  return {
    id: deletedRule.id,
    community_id: deletedRule.community_id,
    title: deletedRule.title,
    description: deletedRule.description ?? undefined,
    rule_number: deletedRule.rule_number,
    created_at: toISOStringSafe(deletedRule.created_at),
    updated_at: toISOStringSafe(deletedRule.updated_at),
  };
}
