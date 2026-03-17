import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderator } from "../prepare/prepare_random_community_platform_moderator";

export async function generate_random_community_platform_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerator.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformModerator> {
  const prepared: ICommunityPlatformModerator.ICreate =
    prepare_random_community_platform_moderator(props.body);
  const result: ICommunityPlatformModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
