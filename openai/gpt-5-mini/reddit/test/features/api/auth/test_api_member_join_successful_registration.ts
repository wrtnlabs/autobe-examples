import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_join_successful_registration(
  connection: api.IConnection,
) {
  // 1) Generate unique test credentials
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  // 2) Build request body using the exact DTO type via `satisfies`
  const requestBody = {
    username,
    email,
    password,
    display_name: displayName,
  } satisfies ICommunityPortalMember.ICreate;

  // 3) Call the API to register the member
  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: requestBody,
    });

  // 4) Validate response type strictly
  typia.assert(authorized);

  // 5) Business-level assertions
  TestValidator.equals(
    "returned username matches request",
    authorized.username,
    username,
  );

  // Token presence and basic sanity
  TestValidator.predicate(
    "authorization token access is present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh is present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Ensure sensitive fields are not present in the public response
  TestValidator.predicate(
    "response does not leak password or password_hash",
    !("password" in authorized) && !("password_hash" in authorized),
  );

  // Ensure email is not exposed if contract excludes it (defensive check)
  TestValidator.predicate(
    "response does not include email field",
    !("email" in authorized),
  );

  // Optional metadata: if created_at is present, it should be non-empty
  if (authorized.created_at !== undefined && authorized.created_at !== null) {
    TestValidator.predicate(
      "created_at is present when provided",
      typeof authorized.created_at === "string" &&
        authorized.created_at.length > 0,
    );
  }

  // Karma is optional; when present ensure it's a number (typia.assert already checked type)
  if (authorized.karma !== undefined) {
    TestValidator.predicate(
      "karma is a number when provided",
      typeof authorized.karma === "number",
    );
  }
}
