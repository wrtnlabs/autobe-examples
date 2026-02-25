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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityRuleTransformer } from "../transformers/CommunityPlatformCommunityRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdRules(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  // Verify community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // Verify admin has permission to create rules for this community
  // (Admin has system-wide permissions per actor definition)
  // Use collector to transform request body to database input
  const data = await CommunityPlatformCommunityRuleCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
    communityPlatformModerators: { id: props.admin.id },
  });
  // Create the rule
  const created =
    await MyGlobal.prisma.community_platform_community_rules.create({
      data,
      ...CommunityPlatformCommunityRuleTransformer.select(),
    });
  // Transform and return the response
  return await CommunityPlatformCommunityRuleTransformer.transform(created);
}
