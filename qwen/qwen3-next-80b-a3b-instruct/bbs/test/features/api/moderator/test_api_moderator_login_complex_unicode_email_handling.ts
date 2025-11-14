import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_complex_unicode_email_handling(
  connection: api.IConnection,
) {
  // Define valid Unicode domains for testing
  const unicodeDomains = [
    "例子.com",
    "пример.рф",
    "مثال.السعودية",
    "тест.срб",
    "검사.kr",
  ] as const;

  // Randomly select one Unicode domain
  const selectedDomain = RandomGenerator.pick(unicodeDomains);

  // Generate a random local part for email (Latin characters only)
  const localPart = typia.random<string & tags.Pattern<"^[a-zA-Z0-9._%+-]+">>();

  // Create complete Unicode email address
  const unicodeEmail =
    `${localPart}@${selectedDomain}` as IPoliticalForumModerator.ILogin;

  // Call login endpoint with Unicode email
  const result: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: unicodeEmail,
    });

  // Validate full response structure with typia.assert
  typia.assert(result);

  // Verify the returned email exactly matches the input (Unicode preserved)
  TestValidator.equals(
    "returned email matches Unicode email",
    result.email,
    unicodeEmail,
  );

  // Verify token structure is present and contains required fields
  TestValidator.equals(
    "access token exists",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof result.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at exists",
    typeof result.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until exists",
    typeof result.token.refreshable_until,
    "string",
  );
}
