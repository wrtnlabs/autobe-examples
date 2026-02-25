import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatistic";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test community statistics endpoint with non-existent community ID.
 *
 * Test scenario: Authenticate as a user, create a community, then attempt to retrieve
 * statistics for a valid UUID that doesn't exist in the system. The API should return
 * null when no statistics record exists for the given community ID, testing the edge
 * case handling for communities that might not yet have generated statistics or for
 * invalid community IDs that pass UUID validation but don't exist in the system.
 */
export async function test_api_community_statistics_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authorize using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(userAuth);
  // 2. Create community using authenticated user
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Attempt to fetch statistics using randomly generated UUID
  const nonExistentCommunityId = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  const statistics =
    await api.functional.communityPlatform.communities.statistics.at(
      connection,
      {
        communityId: nonExistentCommunityId,
      },
    );
  // 4. Verify API returns null for non-existent community ID
  TestValidator.equals(
    "statistics should be null for non-existent community",
    statistics,
    null,
  );
}
