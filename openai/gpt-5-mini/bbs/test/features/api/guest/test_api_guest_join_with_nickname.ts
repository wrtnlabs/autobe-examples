import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumGuest";

export async function test_api_guest_join_with_nickname(
  connection: api.IConnection,
) {
  // 1) Arrange: prepare deterministic input values
  const nickname = "Visitor123";
  const userAgent = "e2e-test-agent";

  // 2) Build request body using exact DTO type and satisfies operator
  const body = {
    nickname,
    user_agent: userAgent,
  } satisfies IEconPoliticalForumGuest.ICreate;

  // 3) Act: call the API
  const output: IEconPoliticalForumGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body,
    });

  // 4) Assert: runtime/type assertions
  // typia.assert validates the full response shape (id is uuid, token fields, formats, etc.)
  typia.assert(output);

  // Business assertions
  TestValidator.equals(
    "guest nickname matches provided nickname",
    output.nickname,
    nickname,
  );
  TestValidator.predicate(
    "authorization access token is present and non-empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization refresh token is present and non-empty",
    output.token.refresh.length > 0,
  );

  // Optional: note on DB teardown. No delete API provided for guests in the SDK
  // If cleanup is required in CI, run DB truncation or schema reset between suites.
}
