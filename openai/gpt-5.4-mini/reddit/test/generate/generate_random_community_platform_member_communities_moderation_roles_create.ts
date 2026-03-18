import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_role } from "../prepare/prepare_random_community_platform_moderation_role";

export async function generate_random_community_platform_member_communities_moderation_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationRole.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformModerationRole> {
  const prepared: ICommunityPlatformModerationRole.ICreate =
    prepare_random_community_platform_moderation_role(props.body);
  return await api.functional.communityPlatform.member.communities.moderationRoles.create(
    connection,
    {
      body: prepared,
      communityId: props.params.communityId,
    },
  );
}
