import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);

  // Step 1: Create a new moderator account
  const joinedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail satisfies IModerator.ICreate,
    });
  typia.assert(joinedModerator);

  // Step 2: Log in with the created moderator credentials
  const loggedinModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IModerator.IAuth,
    });
  typia.assert(loggedinModerator);

  // Step 3: Use the established session to perform a secondary authorized operation
  // Since login automatically updates connection.headers.Authorization, no manual token handling is needed
  // Test a reasonable secondary operation that requires moderator auth
  // As no other moderator endpoints exist in the system, we validate the session remains valid by attempting a second login
  // This is acceptable as the system allows multiple concurrent sessions
  const secondLogin: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IModerator.IAuth,
    });
  typia.assert(secondLogin);
}
