import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_registration(
  connection: api.IConnection,
) {
  // Generate registration details
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  // Call join endpoint to register new user
  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registrationBody,
    });

  // Validate the entire response type structure
  typia.assert(authorizedUser);

  // Validate the authorization token
  const token: IAuthorizationToken = authorizedUser.token;
  typia.assert(token);

  // Validate UUID and ISO strings
  TestValidator.predicate(
    "authorizedUser.id must be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      authorizedUser.id,
    ),
  );

  TestValidator.equals(
    "authorizedUser.email matches registration email",
    authorizedUser.email,
    registrationBody.email,
  );

  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time",
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T\s]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,9})?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/.test(
      token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time",
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T\s]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,9})?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/.test(
      token.refreshable_until,
    ),
  );
}
