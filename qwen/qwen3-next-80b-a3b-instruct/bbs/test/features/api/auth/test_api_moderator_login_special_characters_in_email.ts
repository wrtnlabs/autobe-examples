import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_special_characters_in_email(
  connection: api.IConnection,
) {
  // Test email with valid special characters according to RFC 5322: + . - _
  // These special characters are valid in the local part of an email address
  const specialEmail = "moderator+tag@domain.com";

  // Login using the email as the ILogin string body (as specified in DTO)
  const authenticatedModerator: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: specialEmail,
    });

  // Validate the complete response structure
  typia.assert(authenticatedModerator);

  // Assert specific business logic validations
  TestValidator.equals(
    "authenticated email matches login email",
    authenticatedModerator.email,
    specialEmail,
  );

  // Note: Cannot test invalid emails or missing fields as those are compile-time/layer validation failures
  // Only test successful paths with proper types and valid special characters
}
