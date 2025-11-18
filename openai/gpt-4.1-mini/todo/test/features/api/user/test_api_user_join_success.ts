import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_join_success(connection: api.IConnection) {
  // Generate a unique email for user registration using typia.random and RandomGenerator
  const email = typia.random<string & tags.Format<"email">>();
  // Prepare the user creation payload satisfying ITodoListUser.ICreate
  const userCreateBody = {
    email,
    password: "S3cureP@ssw0rd!", // Secure password as per recommended best practices
    ip: null, // optional client IP is set to null explicitly
    href: "https://todo-list.example.com/register", // client URL initiating the registration
    referrer: "https://todo-list.example.com", // referrer URL for security audit
  } satisfies ITodoListUser.ICreate;

  // Execute the join API call to create the user
  const userAuthorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });

  // Assert the response type and essential business properties
  typia.assert(userAuthorized);

  // Validate the user id is a valid UUID string (implicitly checked by typia.assert)
  // Validate the token structure
  typia.assert<IAuthorizationToken>(userAuthorized.token);

  // Additional business logic validation
  TestValidator.predicate(
    "user id is UUID",
    typeof userAuthorized.id === "string" && userAuthorized.id.length > 0,
  );

  // Validate existence of token access and refresh fields
  TestValidator.predicate(
    "token includes access string",
    typeof userAuthorized.token.access === "string" &&
      userAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token includes refresh string",
    typeof userAuthorized.token.refresh === "string" &&
      userAuthorized.token.refresh.length > 0,
  );

  // Validate token expiration strings conform to date-time format
  TestValidator.predicate(
    "token expired_at is date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
      userAuthorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token refreshable_until is date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(
      userAuthorized.token.refreshable_until,
    ),
  );
}
