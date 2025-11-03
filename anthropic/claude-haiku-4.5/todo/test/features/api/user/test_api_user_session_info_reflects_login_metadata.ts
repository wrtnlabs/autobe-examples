import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_session_info_reflects_login_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();

  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: password,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorized);

  // Validate that user is now authenticated
  TestValidator.equals(
    "user email matches created email",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "user status is active",
    authorized.status === "active",
  );

  // Step 2: Retrieve the current session information
  const sessionInfo =
    await api.functional.todoApp.user.auth.session(connection);
  typia.assert(sessionInfo);

  // Step 3: Validate session metadata reflects login information
  TestValidator.equals(
    "session user ID matches created user",
    sessionInfo.userId,
    authorized.id,
  );
  TestValidator.equals(
    "session user email matches created user email",
    sessionInfo.userEmail,
    authorized.email,
  );

  // Validate session creation timestamp is recent (within last few seconds)
  const now = new Date();
  const createdTime = new Date(sessionInfo.createdAt);
  const timeDiff = now.getTime() - createdTime.getTime();
  TestValidator.predicate(
    "session created timestamp is recent",
    timeDiff >= 0 && timeDiff < 10000,
  );

  // Validate session metadata fields are populated and meaningful
  TestValidator.predicate(
    "IP address is present and populated",
    sessionInfo.ipAddress.length > 0,
  );

  TestValidator.predicate(
    "referrer URL is present and populated",
    sessionInfo.referrerUrl.length > 0,
  );

  TestValidator.predicate(
    "connection URL is present and populated",
    sessionInfo.connectionUrl.length > 0,
  );

  // Validate session is active (not expired)
  TestValidator.predicate(
    "session is active and not expired",
    sessionInfo.expiredAt === null || sessionInfo.expiredAt === undefined,
  );
}
