import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_accepts_valid_unicode_email(
  connection: api.IConnection,
) {
  // Generate a random email with UTF-8 international domain name support
  const unicodeEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Generate a random password meeting minimum requirements
  const password: string & tags.MinLength<8> & tags.MaxLength<100> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<100>>();

  // Attempt to login with Unicode email address (login expects the email as string, not object)
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: unicodeEmail,
    });

  // Validate the entire response structure
  typia.assert(response);

  // Verify the returned email matches the submitted email (exact Unicode match)
  TestValidator.equals(
    "returned email matches submitted Unicode email",
    response.email,
    unicodeEmail,
  );
}
