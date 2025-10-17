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

export async function postRedditLikeModeratorCommunitiesCommunityIdRules(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityRule.ICreate;
}): Promise<IRedditLikeCommunityRule> {
  const { moderator, communityId, body } = props;

  // Authorization: Verify moderator has permission for this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Verify community exists and is active
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Enforce maximum 15 rules per community
  const existingRuleCount =
    await MyGlobal.prisma.reddit_like_community_rules.count({
      where: {
        community_id: communityId,
      },
    });

  if (existingRuleCount >= 15) {
    throw new HttpException(
      "Maximum rule limit reached: Communities can have up to 15 rules",
      400,
    );
  }

  // Create the community rule
  const now = new Date();
  const nowISO = toISOStringSafe(now);

  const created = await MyGlobal.prisma.reddit_like_community_rules.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_id: communityId,
      title: body.title,
      description: body.description ?? undefined,
      rule_type: body.rule_type,
      display_order: body.display_order,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    community_id: created.community_id as string & tags.Format<"uuid">,
    title: created.title,
    description: created.description ?? undefined,
    rule_type: created.rule_type,
    display_order: created.display_order,
    created_at: nowISO,
    updated_at: nowISO,
  };
}
