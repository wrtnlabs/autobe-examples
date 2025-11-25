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

export async function putRedditCommunityModeratorCommunitiesCommunityNameRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  ruleId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityRule.IUpdate;
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

  const moderatorAuth =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.moderator.id,
      },
    });

  if (!moderatorAuth) {
    throw new HttpException(
      "Forbidden: You do not have moderator authority over this community",
      403,
    );
  }

  const existingRule =
    await MyGlobal.prisma.reddit_community_community_rules.findUnique({
      where: {
        id: props.ruleId,
      },
    });

  if (!existingRule) {
    throw new HttpException("Rule not found", 404);
  }

  if (existingRule.community_id !== community.id) {
    throw new HttpException(
      "Rule does not belong to the specified community",
      400,
    );
  }

  const updated = await MyGlobal.prisma.reddit_community_community_rules.update(
    {
      where: {
        id: props.ruleId,
      },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.rule_number !== undefined && {
          rule_number: props.body.rule_number,
        }),
        updated_at: new Date(),
      },
    },
  );

  return {
    id: updated.id,
    community_id: updated.community_id,
    title: updated.title,
    description: updated.description,
    rule_number: updated.rule_number,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
