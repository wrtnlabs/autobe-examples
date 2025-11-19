import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Test successful moderator registration with all required fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";
  const username = "moderator_" + RandomGenerator.alphaNumeric(8);

  const result: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: email,
        password: password,
        username: username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(result);

  // Validate response structure
  TestValidator.equals("moderator email matches input", result.email, email);
  TestValidator.equals(
    "moderator username matches input",
    result.username,
    username,
  );
  TestValidator.predicate(
    "moderator has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.equals(
    "moderator email is not verified initially",
    result.email_verified,
    false,
  );
  TestValidator.equals(
    "moderator account status is active",
    result.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator moderation tier is full",
    result.moderation_tier,
    "full",
  );
  TestValidator.predicate(
    "moderator has authorization token",
    result.token !== null && result.token !== undefined,
  );
  TestValidator.predicate(
    "authorization token has access token",
    result.token.access !== null &&
      result.token.access !== undefined &&
      result.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token has refresh token",
    result.token.refresh !== null &&
      result.token.refresh !== undefined &&
      result.token.refresh.length > 0,
  );
}
