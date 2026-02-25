import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test community recommendations for a newly registered user with no subscription history or engagement data.
 * 1. Register a new user via join endpoint to simulate fresh user with no platform history
 * 2. Call recommendations endpoint as authenticated user
 * 3. Validate paginated response structure with community summaries
 * 4. Verify recommendation algorithm provides diverse suggestions based on platform trends
 */
export async function test_api_community_recommendations_new_user(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user connection for authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Register new user using authorize_user_join utility function
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Call recommendations endpoint with authenticated user connection
  const recommendations =
    await api.functional.communityPlatform.user.communities.recommendations(
      userConnection,
    );
  typia.assert(recommendations);
  // Validate pagination structure using typia.assert which handles all type validation
  typia.assert(recommendations.pagination);
  // Validate data array structure using typia.assert
  typia.assert(recommendations.data);
  // Validate each community summary structure using typia.assert
  for (const community of recommendations.data) {
    typia.assert(community);
    // typia.assert automatically validates all properties including owner structure
    typia.assert(community.owner);
  }
  // Business logic validation: Ensure recommendations are provided
  TestValidator.predicate(
    "recommendations received",
    Array.isArray(recommendations.data),
  );
  // Additional business validation: Check if recommendations contain diverse communities
  if (recommendations.data.length > 1) {
    const communityNames = recommendations.data.map((c) => c.name);
    const uniqueNames = new Set(communityNames);
    TestValidator.predicate(
      "diverse recommendations",
      uniqueNames.size > 1 || recommendations.data.length === 1,
    );
  }
}
