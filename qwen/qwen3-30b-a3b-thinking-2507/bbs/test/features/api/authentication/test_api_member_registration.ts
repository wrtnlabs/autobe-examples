import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection specifically for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate a valid email address meeting email format requirements
  const email = `${RandomGenerator.name(2)}.${RandomGenerator.name(1).toLowerCase()}_test@example.com`;
  // Generate a password meeting complexity requirements (12+ characters, uppercase, lowercase, number, special character)
  const password = `${RandomGenerator.alphabets(3)}${RandomGenerator.alphaNumeric(2)}${RandomGenerator.alphabets(2)}${RandomGenerator.alphaNumeric(2)}!`;
  // Register the member using the utility authorization function
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  // Validate the API response structure using typia.assert
  typia.assert(authorizedMember);
  // Validate the member ID format (should be a string)
  TestValidator.equals(
    "ID should be a string",
    typeof authorizedMember.id,
    "string",
  );
  // Validate the token fields
  TestValidator.equals(
    "token access should be a string",
    typeof authorizedMember.token.access,
    "string",
  );
  TestValidator.equals(
    "token refresh should be a string",
    typeof authorizedMember.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token expired_at should be a string",
    typeof authorizedMember.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token refreshable_until should be a string",
    typeof authorizedMember.token.refreshable_until,
    "string",
  );
  // Validate count fields as numbers
  TestValidator.equals(
    "article_count should be a number",
    typeof authorizedMember.article_count,
    "number",
  );
  TestValidator.equals(
    "comment_count should be a number",
    typeof authorizedMember.comment_count,
    "number",
  );
}
