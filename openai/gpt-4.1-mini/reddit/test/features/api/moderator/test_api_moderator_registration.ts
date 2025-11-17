import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_moderator_registration(
  connection: api.IConnection,
) {
  // Generate a random email using typia for a valid email format
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();

  // Create the request body to register a new moderator
  const requestBody = {
    email: moderatorEmail,
    password: "StrongPass123!",
  } satisfies IRedditCommunityModerator.ICreate;

  // Call the join API to register a new moderator
  const output: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: requestBody,
    });

  // Assert that the returned provider conforms to the authorized moderator type
  typia.assert(output);

  // Confirm that the moderator email is as we sent
  TestValidator.equals("moderator email matches", output.email, moderatorEmail);

  // Assert all required properties exist and have expected format
  TestValidator.predicate(
    "id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    !isNaN(Date.parse(output.updated_at)),
  );

  // deleted_at can be null or ISO date-time, verify null or valid date
  TestValidator.predicate(
    "deleted_at is null or ISO 8601 date-time",
    output.deleted_at === null ||
      output.deleted_at === undefined ||
      !isNaN(Date.parse(output.deleted_at ?? "")),
  );

  // Confirm the token object contains correct string tokens and date strings
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time",
    !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time",
    !isNaN(Date.parse(output.token.refreshable_until)),
  );
}
