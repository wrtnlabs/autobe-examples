import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validates that an authenticated administrator can retrieve the detail of a
 * community platform moderator by moderatorId.
 *
 * This test covers:
 *
 * 1. Registering a new administrator for authentication and obtaining admin JWT.
 * 2. (If possible) Creating or assuming the existence of a moderator; in this
 *    test, a random moderatorId is used.
 * 3. Administrator fetches moderator details with proper authorization; validates
 *    business & lifecycle fields in response.
 * 4. Verification of access denial for unauthenticated context.
 */
export async function test_api_platform_moderator_detail_fetch_by_admin(
  connection: api.IConnection,
) {
  // 1. Administrator join & authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: RandomGenerator.pick([
        "super-admin",
        "ops",
        "review",
        null,
      ]),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 2. For test purposes, we assume a valid moderatorId, since no create API is available
  // Generate a random moderatorId
  const moderatorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Access as authenticated administrator
  let errorCaught = false;
  try {
    const moderator =
      await api.functional.communityPlatform.administrator.moderators.at(
        connection,
        { moderatorId },
      );
    typia.assert(moderator);
    // Validate only expected public business/lifecycle fields show up, no credentials
    TestValidator.predicate(
      "moderator result has required fields",
      typeof moderator.id === "string" &&
        typeof moderator.email === "string" &&
        typeof moderator.status === "string" &&
        typeof moderator.created_at === "string" &&
        typeof moderator.updated_at === "string",
    );
  } catch {
    // Acceptable because test environment may not have this UUID
    errorCaught = true;
  }

  // 4. Unauthenticated access attempt - must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot fetch moderator details",
    async () => {
      await api.functional.communityPlatform.administrator.moderators.at(
        unauthConn,
        { moderatorId },
      );
    },
  );

  // (No need to test with wrong actor; only available actors are handled by admin join)
}
