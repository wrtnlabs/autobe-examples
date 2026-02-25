import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";

export namespace CommunityPlatformCommunityRuleTransformer {
  export type Payload = Prisma.community_platform_community_rulesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rule_text: true,
        rule_order: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityRule> {
    return {
      id: input.id,
      rule_text: input.rule_text,
      rule_order: input.rule_order,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
