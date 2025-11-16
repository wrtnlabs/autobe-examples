import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_returns_authorization_tokens(
  connection: api.IConnection,
) {
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<100>
    >(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  typia.assert(authorized);

  TestValidator.predicate(
    "authorized object contains id field",
    authorized.id !== undefined && authorized.id !== null,
  );

  TestValidator.predicate(
    "authorized object contains token field",
    authorized.token !== undefined && authorized.token !== null,
  );

  TestValidator.predicate(
    "authorized object contains moderator summary",
    authorized.moderator !== undefined && authorized.moderator !== null,
  );

  const token: IAuthorizationToken = authorized.token;

  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at is a valid ISO 8601 date-time string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until is a valid ISO 8601 date-time string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  const moderatorSummary = authorized.moderator;

  TestValidator.predicate(
    "moderator id is a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorSummary.id,
    ),
  );

  TestValidator.predicate(
    "moderator display_name is within valid length",
    moderatorSummary.display_name.length >= 1 &&
      moderatorSummary.display_name.length <= 50,
  );

  TestValidator.equals(
    "new moderator account status is active",
    moderatorSummary.account_status,
    "active",
  );

  TestValidator.predicate(
    "expired_at is a future timestamp",
    new Date(token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );
}
