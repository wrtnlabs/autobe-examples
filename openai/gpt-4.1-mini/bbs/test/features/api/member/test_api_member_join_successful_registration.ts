import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_join_successful_registration(
  connection: api.IConnection,
) {
  // Prepare unique and valid member creation data
  const email: string & tags.Format<"email"> =
    `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@mail.com`; // realistic valid email
  const password = "P@ssw0rd123"; // strong password as a sample
  const nickname = RandomGenerator.name(2); // realistic two-word nickname

  // Construct request body for join
  const body = {
    email,
    password,
    nickname,
  } satisfies IDiscussionBoardMember.ICreate;

  // Call the join API endpoint
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body });

  // Assert the response is type-safe and valid
  typia.assert(member);

  // Validate the member.id is UUID format
  TestValidator.predicate(
    "member ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      member.id,
    ),
  );

  // Validate the token is present and valid
  TestValidator.predicate(
    "token presence",
    member.token !== null && member.token !== undefined,
  );

  // Validate token properties format
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof member.token.access === "string" && member.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof member.token.refresh === "string" && member.token.refresh.length > 0,
  );

  // Validate token expiry and refreshable are ISO 8601 date-time strings
  TestValidator.predicate(
    "token.expired_at format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      member.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token.refreshable_until format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      member.token.refreshable_until,
    ),
  );

  // Optional: You could add further functionality to test login and authenticated access using the token
}
