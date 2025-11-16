import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_join(
  connection: api.IConnection,
) {
  // Construct a valid IRedditCommunityRegisteredUser.IJoin request body with explicit required properties
  const requestBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  // Call the join endpoint to register the user
  const output = await api.functional.auth.registeredUser.join(connection, {
    body: requestBody,
  });

  // Assert the returned authorized user with token
  typia.assert(output);

  // Validate key properties
  TestValidator.predicate(
    "valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.equals(
    "input email matches output",
    output.email,
    requestBody.email,
  );

  TestValidator.predicate(
    "role is non-empty string",
    typeof output.role === "string" && output.role.length > 0,
  );
  TestValidator.predicate(
    "status is valid enum",
    ["active", "inactive", "banned"].includes(output.status),
  );

  TestValidator.predicate(
    "created_at ISO date-time format",
    typeof output.created_at === "string" && output.created_at.endsWith("Z"),
  );

  const token = output.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "token access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at ISO date-time format",
    typeof token.expired_at === "string" && token.expired_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "token refreshable_until ISO date-time format",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.endsWith("Z"),
  );
}
