import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderators_get_by_id_active_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection (member) and never the base connection directly.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const community =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const communityModerator =
    await generate_random_community_platform_community_moderators_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: memberJoin.id,
        },
      },
    );
  typia.assert(communityModerator);
  const first = await api.functional.communityPlatform.communityModerators.at(
    memberConnection,
    {
      communityModeratorId: communityModerator.id,
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "community moderator id matches",
    first.id,
    communityModerator.id,
  );
  TestValidator.equals(
    "community id matches",
    first.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator user id matches",
    first.moderator_user_id,
    memberJoin.id,
  );
  TestValidator.equals("deleted_at is null", first.deleted_at, null);
  const second = await api.functional.communityPlatform.communityModerators.at(
    memberConnection,
    {
      communityModeratorId: communityModerator.id,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "second community moderator id matches",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "second community id matches",
    second.community_id,
    first.community_id,
  );
  TestValidator.equals(
    "second moderator user id matches",
    second.moderator_user_id,
    first.moderator_user_id,
  );
  TestValidator.equals("second deleted_at is null", second.deleted_at, null);
}
