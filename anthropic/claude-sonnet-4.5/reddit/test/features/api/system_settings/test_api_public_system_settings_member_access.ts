import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

/**
 * Test that authenticated members can successfully retrieve public
 * platform-wide configuration settings.
 *
 * This test validates that authenticated users can access public system
 * settings and receive properly structured configuration data. The workflow
 * includes:
 *
 * 1. Create a new member account through registration
 * 2. Use the authenticated connection (token automatically managed by SDK)
 * 3. Retrieve public system settings
 * 4. Validate response structure and data integrity
 *
 * This ensures consistent behavior across authenticated contexts when accessing
 * public platform configuration parameters.
 */
export async function test_api_public_system_settings_member_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Retrieve public system settings with authenticated connection
  const settings: IRedditLikeSystemSetting.IPublic =
    await api.functional.redditLike.system.settings._public.index(connection);
  typia.assert(settings);

  // Step 3: Validate response structure contains proper configuration parameters
  TestValidator.predicate(
    "settings should have key property",
    typeof settings.key === "string" && settings.key.length > 0,
  );

  TestValidator.predicate(
    "settings should have value property",
    typeof settings.value === "string",
  );

  TestValidator.predicate(
    "settings should have value_type property",
    typeof settings.value_type === "string" && settings.value_type.length > 0,
  );
}
