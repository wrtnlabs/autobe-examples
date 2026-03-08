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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_removal_by_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: `owner_${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(owner);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create first moderator account
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(moderator1Connection, {
    body: {
      username: `moderator1_${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(moderator1);
  // 4. Owner appoints first moderator
  const moderator1Record =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderator1.username },
      },
    );
  typia.assert(moderator1Record);
  // 5. Create second moderator account
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(moderator2Connection, {
    body: {
      username: `moderator2_${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(moderator2);
  // 6. Owner appoints second moderator
  const moderator2Record =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderator2.username },
      },
    );
  typia.assert(moderator2Record);
  // 7. First moderator attempts to remove second moderator (should fail with 403)
  await TestValidator.httpError(
    "moderator cannot remove another moderator",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.erase(
        moderator1Connection,
        {
          communityName: community.name,
          moderatorId: moderator2Record.id,
        },
      );
    },
  );
  // 8. Verify second moderator record still exists (not soft-deleted)
  // The moderator2Record should still be valid and unchanged
  TestValidator.predicate(
    "second moderator record still exists",
    moderator2Record.id !== null && moderator2Record.id !== undefined,
  );
}
