import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityRuleCollector } from "../collectors/CommunityPlatformCommunityRuleCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityRuleTransformer } from "../transformers/CommunityPlatformCommunityRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformModeratorCommunitiesCommunityIdRules(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  // Validate community exists and is active (not deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  // Verify the authenticated moderator has permissions for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator permissions for this community",
      403,
    );
  }
  // Ensure rule_order is unique within the community
  const existingRule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        rule_order: props.body.rule_order,
        deleted_at: null,
      },
    });
  if (existingRule) {
    throw new HttpException(
      "Rule order must be unique within the community",
      400,
    );
  }
  // Create the rule using collector
  const rule = await MyGlobal.prisma.community_platform_community_rules.create({
    data: await CommunityPlatformCommunityRuleCollector.collect({
      body: props.body,
      communityPlatformCommunities: { id: props.communityId },
      communityPlatformModerators: { id: props.moderator.id },
    }),
    ...CommunityPlatformCommunityRuleTransformer.select(),
  });
  // Return the complete created rule entity
  return await CommunityPlatformCommunityRuleTransformer.transform(rule);
}
