import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function test_api_moderator_request_password_reset(
  connection: api.IConnection,
) {
  // 1) Happy-path: create a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorPassword = "P@ssw0rd!234";

  const created: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalModerator.ICreate,
    });
  // Validate the response shape and required fields
  typia.assert(created);

  // Business assertions
  TestValidator.equals(
    "created moderator username matches request",
    created.username,
    moderatorUsername,
  );
  // token presence and structure validated by typia.assert

  // 2) Request password reset for existing email
  const existingResp: ICommunityPortalModerator.IRequestPasswordResetResponse =
    await api.functional.auth.moderator.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPortalModerator.IRequestPasswordReset,
      },
    );
  typia.assert(existingResp);
  TestValidator.predicate(
    "existing email returned a non-empty acknowledgement message",
    typeof existingResp.message === "string" && existingResp.message.length > 0,
  );

  // 3) Request password reset for a non-existent email (should be neutral)
  let nonExistentEmail: string = typia.random<string & tags.Format<"email">>();
  // Ensure we don't accidentally reuse the same email
  if (nonExistentEmail === moderatorEmail) {
    // unlikely, but regenerate deterministically
    nonExistentEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  }

  const nonExistingResp: ICommunityPortalModerator.IRequestPasswordResetResponse =
    await api.functional.auth.moderator.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ICommunityPortalModerator.IRequestPasswordReset,
      },
    );
  typia.assert(nonExistingResp);

  // Assert neutral acknowledgement: messages must be identical to prevent enumeration
  TestValidator.equals(
    "password reset acknowledgement is neutral (existing vs non-existing)",
    existingResp.message,
    nonExistingResp.message,
  );

  // 4) Negative case: malformed email format -> expect validation error (400)
  await TestValidator.error(
    "malformed email format should cause validation error",
    async () => {
      await api.functional.auth.moderator.password.request_reset.requestPasswordReset(
        connection,
        {
          // Intentionally malformed email; still must satisfy the DTO type at compile time,
          // but runtime validation should reject it. To satisfy TypeScript, provide a string.
          body: {
            email: "not-an-email",
          } satisfies ICommunityPortalModerator.IRequestPasswordReset,
        },
      );
    },
  );

  // Note: Side-effect verification (reset token persisted and TTL set) cannot be
  // performed via the public SDK functions provided here. That verification
  // requires either a test DB helper, a captured test email sink, or an admin
  // query endpoint. If available in the test environment, perform that check
  // out-of-band and assert token presence and expiry.
}
