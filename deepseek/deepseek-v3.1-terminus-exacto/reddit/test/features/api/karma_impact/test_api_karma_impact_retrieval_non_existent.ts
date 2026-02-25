import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test retrieval attempt for a non-existent karma impact record.
 * Create a test user via join authentication, attempt to retrieve a karma impact record
 * using a valid UUID format that does not correspond to any existing record in the system.
 * Verify the API returns a proper 404 Not Found error response with appropriate error
 * message confirming the karma impact record does not exist.
 */
export async function test_api_karma_impact_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authenticated access
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Generate a valid UUID that doesn't exist in the system
  const nonExistentKarmaImpactId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent karma impact record and verify 404 error
  await TestValidator.error(
    "retrieving non-existent karma impact should return 404",
    async () => {
      await api.functional.communityPlatform.user.vote_karma_impacts.at(
        userConnection,
        {
          karmaImpactId: nonExistentKarmaImpactId,
        },
      );
    },
  );
}
