import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_registration(connection: api.IConnection) {
  // Guests join without authentication and receive JWT tokens
  const output: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {},
    });
  typia.assert(output);
  TestValidator.predicate(
    "guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.predicate(
    "guest has nickname",
    typeof output.nickname === "string" && output.nickname.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  TestValidator.predicate(
    "token object has access token",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token object has refresh token",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO datetime",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is ISO datetime",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );
}
