import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_join(connection: api.IConnection) {
  // Generate realistic registration details
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Prepare the request body for member creation
  const requestBody = {
    email,
    password,
  } satisfies IDiscussionBoardMember.ICreate;

  // Call the join API endpoint to create a new member
  const output: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: requestBody,
    });

  // Assert the response shape and content
  typia.assert(output);
  TestValidator.predicate(
    "valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.predicate(
    "access token is string",
    typeof output.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof output.token.refresh === "string",
  );
  TestValidator.predicate(
    "expired_at is valid date-time format",
    typeof output.token.expired_at === "string" &&
      !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    typeof output.token.refreshable_until === "string" &&
      !isNaN(Date.parse(output.token.refreshable_until)),
  );
}
