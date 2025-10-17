import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_registration_creation(
  connection: api.IConnection,
) {
  // Generate realistic admin join request body
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphabets(12); // 12-char alphabetic password for test
  const displayName = RandomGenerator.name(2); // 2-word display name

  const joinBody = {
    email,
    password,
    displayName,
  } satisfies IDiscussionBoardAdmin.IJoin;

  // Call the join API for admin registration
  const response: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });

  typia.assert(response);

  // Validate important fields
  TestValidator.predicate(
    "admin id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.equals("admin email", response.email, email);
  TestValidator.equals(
    "admin display name",
    response.display_name,
    displayName,
  );

  // Ensure password hash is non-empty string
  TestValidator.predicate(
    "password_hash present",
    typeof response.password_hash === "string" &&
      response.password_hash.length > 0,
  );

  // Check created_at and updated_at are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at iso8601",
    typeof response.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        response.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at iso8601",
    typeof response.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        response.updated_at,
      ),
  );

  // deleted_at can be null or undefined or absent
  if ("deleted_at" in response) {
    TestValidator.predicate(
      "deleted_at null or iso8601",
      response.deleted_at === null ||
        (typeof response.deleted_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
            response.deleted_at,
          )),
    );
  }

  // Validate token fields
  const token = response.token;
  TestValidator.predicate(
    "token.access nonempty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh nonempty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Check token expired_at and refreshable_until are valid ISO 8601 date-time
  TestValidator.predicate(
    "token.expired_at iso8601",
    typeof token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until iso8601",
    typeof token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        token.refreshable_until,
      ),
  );
}
