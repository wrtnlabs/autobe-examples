import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_moderator_access_denied_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A who will become the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a community with member A as the automatic owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create member B who will be appointed as a moderator
  const moderatorMember = await authorize_member_join(connection, {});
  typia.assert(moderatorMember);
  // Step 4: Add member B as a moderator to the community
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderatorMember.id,
        },
      },
    );
  typia.assert(moderatorRecord);
  // Step 5: Create member C who has no moderation role in the community
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsider = await authorize_member_join(outsiderConnection, {});
  typia.assert(outsider);
  // Step 6 & 7: Attempt to retrieve moderator details as member C (non-moderator)
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot access moderator details",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.at(
        outsiderConnection,
        {
          communityId: community.id,
          moderatorId: moderatorRecord.id,
        },
      );
    },
  );
}
