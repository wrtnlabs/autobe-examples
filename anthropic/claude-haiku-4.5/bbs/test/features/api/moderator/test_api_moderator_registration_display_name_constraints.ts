import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_display_name_constraints(
  connection: api.IConnection,
) {
  // Test 1: Empty display_name (0 characters) should fail with HTTP 400
  await TestValidator.httpError(
    "empty display_name should fail with constraint violation",
    400,
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: RandomGenerator.alphaNumeric(8),
          password: "securePass123",
          display_name: "",
        } satisfies IDiscussionBoardModerator.ICreate,
      });
    },
  );

  // Test 2: Single character display_name should succeed
  const singleCharResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "securePass123",
        display_name: "A",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(singleCharResponse);
  TestValidator.predicate(
    "single character display_name registration should succeed",
    singleCharResponse.moderator.display_name === "A",
  );

  // Test 3: Maximum 100 character display_name should succeed
  const maxDisplayName = RandomGenerator.alphabets(100);
  const maxCharResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "securePass123",
        display_name: maxDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(maxCharResponse);
  TestValidator.predicate(
    "100 character display_name should be accepted",
    maxCharResponse.moderator.account_status === "active",
  );

  // Test 4: Unicode characters in display_name within limit should succeed
  const unicodeDisplayName = "모더레이터 Adm";
  const unicodeResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "securePass123",
        display_name: unicodeDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(unicodeResponse);
  TestValidator.predicate(
    "unicode characters in display_name should be accepted",
    unicodeResponse.moderator.account_status === "active",
  );

  // Test 5: Special characters in display_name within limit should succeed
  const specialDisplayName = "Admin-User@24";
  const specialResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "securePass123",
        display_name: specialDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(specialResponse);
  TestValidator.predicate(
    "special characters in display_name should be accepted",
    specialResponse.moderator.account_status === "active",
  );

  // Test 6: Verify complete response structure for valid registration
  TestValidator.predicate(
    "authorized response should contain valid access token",
    specialResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "authorized response should contain valid refresh token",
    specialResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "moderator account should be created with active status",
    specialResponse.moderator.account_status === "active",
  );

  TestValidator.predicate(
    "moderator should have valid id",
    specialResponse.id.length > 0,
  );
}
