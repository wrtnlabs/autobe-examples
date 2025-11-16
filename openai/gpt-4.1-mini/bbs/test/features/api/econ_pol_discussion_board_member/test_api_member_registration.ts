import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function test_api_member_registration(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique user registration data
  const username = RandomGenerator.alphaNumeric(10);
  const email = `${username}@example.com` as string & tags.Format<"email">;
  const password = RandomGenerator.alphaNumeric(12);

  // Prepare the request body for member creation
  const requestBody = {
    username,
    email: email,
    password,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  // Step 2: Call the join API endpoint to register a new member
  const authorizedMember: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: requestBody });

  // Step 3: Validate the response data type correctness
  typia.assert(authorizedMember);

  // Step 4: Basic property value validation
  TestValidator.equals("username matches", authorizedMember.username, username);
  TestValidator.equals("email matches", authorizedMember.email, email);
  // token presence
  TestValidator.predicate(
    "access token exists",
    typeof authorizedMember.token.access === "string" &&
      authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof authorizedMember.token.refresh === "string" &&
      authorizedMember.token.refresh.length > 0,
  );
  // created_at and updated_at are date-time strings
  TestValidator.predicate(
    "created_at ISO 8601 format",
    typeof authorizedMember.created_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.\d{3}Z$/.test(
        authorizedMember.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at ISO 8601 format",
    typeof authorizedMember.updated_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.\d{3}Z$/.test(
        authorizedMember.updated_at,
      ),
  );
  // deleted_at should be null or undefined
  if (
    authorizedMember.deleted_at !== null &&
    authorizedMember.deleted_at !== undefined
  ) {
    throw new Error(
      "deleted_at should be null or undefined on new registered member",
    );
  }
}
