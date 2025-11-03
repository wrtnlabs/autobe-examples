import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_admin_join_registration(
  connection: api.IConnection,
) {
  // Generate a valid existing user_id with uuid format.
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Construct the request body with required user_id.
  const requestBody = {
    user_id: userId,
  } satisfies IRedditCommunityAdmin.ICreate;

  // Call the join API endpoint to create new admin and obtain authorization.
  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: requestBody,
    });

  // Assert the response type correctness.
  typia.assert(authorizedAdmin);

  // Validate critical fields are non-empty and valid.
  TestValidator.predicate(
    "admin id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedAdmin.id,
    ),
  );
  TestValidator.equals(
    "admin user_id matches request",
    authorizedAdmin.user_id,
    userId,
  );

  // Check presence and structure of the token
  TestValidator.predicate(
    "token object exists",
    authorizedAdmin.token !== null && authorizedAdmin.token !== undefined,
  );

  // Validate token string properties are not empty
  TestValidator.predicate(
    "token.access is non-empty",
    typeof authorizedAdmin.token.access === "string" &&
      authorizedAdmin.token.access.length > 10,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    typeof authorizedAdmin.token.refresh === "string" &&
      authorizedAdmin.token.refresh.length > 10,
  );

  // Validate token expiry fields match ISO date-time format
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/.test(
      authorizedAdmin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z$/.test(
      authorizedAdmin.token.refreshable_until,
    ),
  );

  // Optionally validate user summary presence if exists
  if (authorizedAdmin.user !== undefined && authorizedAdmin.user !== null) {
    typia.assert(authorizedAdmin.user);
    TestValidator.predicate(
      "user summary id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        authorizedAdmin.user.id,
      ),
    );
    TestValidator.predicate(
      "user summary email has email format",
      /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i.test(authorizedAdmin.user.email),
    );
  }
}
