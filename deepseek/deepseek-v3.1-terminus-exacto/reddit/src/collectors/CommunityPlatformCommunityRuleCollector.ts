import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityRuleCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityRule.ICreate;
    communityPlatformCommunities: IEntity; // from path parameter communityId
    communityPlatformModerators: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      rule_text: props.body.rule_text,
      rule_order: props.body.rule_order,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      community: { connect: { id: props.communityPlatformCommunities.id } },
      moderator: { connect: { id: props.communityPlatformModerators.id } },
    } satisfies Prisma.community_platform_community_rulesCreateInput;
  }
}
