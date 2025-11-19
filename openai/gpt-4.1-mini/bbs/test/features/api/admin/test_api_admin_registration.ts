import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_registration(connection: api.IConnection) {
  // Generate realistic admin registration data using typia and RandomGenerator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  // Call the admin join API
  const authorizedAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // Validate critical fields and types
  TestValidator.predicate(
    "admin id is non-empty UUID",
    typeof authorizedAdmin.id === "string" && authorizedAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "admin email matches input",
    authorizedAdmin.email === adminJoinBody.email,
  );
  TestValidator.predicate(
    "admin nickname matches input",
    authorizedAdmin.nickname === adminJoinBody.nickname,
  );
  TestValidator.predicate(
    "admin token object exists",
    authorizedAdmin.token !== null && typeof authorizedAdmin.token === "object",
  );

  // Assert token structure
  const token: IAuthorizationToken = authorizedAdmin.token;
  TestValidator.predicate(
    "token access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  TestValidator.predicate(
    "token expired_at is valid ISO date-time",
    isoDateRegex.test(token.expired_at),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO date-time",
    isoDateRegex.test(token.refreshable_until),
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof authorizedAdmin.created_at === "string" &&
      authorizedAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof authorizedAdmin.updated_at === "string" &&
      authorizedAdmin.updated_at.length > 0,
  );

  // The deleted_at may be null or undefined, if defined and non-null, validate format
  if (
    authorizedAdmin.deleted_at !== undefined &&
    authorizedAdmin.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is valid ISO date-time",
      typeof authorizedAdmin.deleted_at === "string" &&
        authorizedAdmin.deleted_at.length > 0,
    );
  }
}
