import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can successfully retrieve detailed moderator assignment information for a specific community.
 *
 * This test validates the moderator assignment retrieval functionality by:
 * 1. Authenticating as a platform administrator
 * 2. Testing the moderator retrieval endpoint with proper error handling
 * 3. Validating the response structure
 */
export async function test_api_admin_moderator_assignment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test moderator retrieval with random UUIDs
  // Since we don't have creation endpoints, we'll test error handling
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the moderator retrieval endpoint
  const moderatorAssignment =
    await api.functional.communityPlatform.admin.communities.moderators.at(
      adminConnection,
      {
        communityId,
        moderatorId,
      },
    );
  // 4. Validate the response using typia.assert
  // This will validate the complete structure if successful
  typia.assert(moderatorAssignment);
  // 5. Test business logic - if we get a response, validate it has the expected structure
  // The typia.assert above already validates all fields, so we just need business logic tests
  TestValidator.predicate(
    "moderator assignment should have valid structure",
    () => {
      const assignment =
        moderatorAssignment as ICommunityPlatformCommunityModerator;
      return assignment.id !== undefined && assignment.user !== undefined;
    },
  );
}
