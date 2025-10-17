import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditLikeModeratorCommunitiesCommunityIdRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityRule.IUpdate;
}): Promise<IRedditLikeCommunityRule> {
  const { moderator, communityId, ruleId, body } = props;

  const existingRule =
    await MyGlobal.prisma.reddit_like_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
    });

  if (!existingRule) {
    throw new HttpException("Rule not found in the specified community", 404);
  }

  const moderatorPermission =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorPermission) {
    throw new HttpException(
      "Unauthorized: You must be a moderator of this community to update rules",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_like_community_rules.update({
    where: {
      id: ruleId,
    },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      rule_type: body.rule_type ?? undefined,
      display_order: body.display_order ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    community_id: updated.community_id as string & tags.Format<"uuid">,
    title: updated.title,
    description: updated.description ?? undefined,
    rule_type: updated.rule_type,
    display_order: updated.display_order as number & tags.Type<"int32">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
