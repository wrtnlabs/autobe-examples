import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test session validation behavior when the associated user account has been
 * suspended.
 *
 * This test validates that session validation properly rejects access tokens
 * for suspended user accounts, ensuring session integrity checks include
 * account status validation. Even with technically valid non-expired tokens,
 * the system must prevent access when the underlying user account has been
 * suspended.
 *
 * Test workflow:
 *
 * 1. Register a new member account to obtain valid authentication tokens
 * 2. Create an administrator account with privileges to issue platform suspensions
 * 3. Have the administrator issue a platform suspension against the member account
 * 4. Attempt to validate the access token for the suspended member account
 * 5. Verify that session validation fails and returns appropriate error
 */
export async function test_api_session_validation_deleted_user_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to obtain valid tokens
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Store the member's access token for later validation attempt
  const memberAccessToken = member.token.access;

  // Step 2: Create an administrator account with privileges to issue suspensions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 3: Administrator issues platform suspension against the member account
  const suspensionData = {
    suspended_member_id: member.id,
    suspension_reason_category: "platform_violation",
    suspension_reason_text: "Testing session validation with suspended account",
    internal_notes: "E2E test suspension for session validation testing",
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikePlatformSuspension.ICreate;

  const suspension: IRedditLikePlatformSuspension =
    await api.functional.redditLike.admin.platform.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 4 & 5: Attempt to validate the suspended member's access token
  // This should fail because the account is now suspended
  await TestValidator.error(
    "session validation should fail for suspended account",
    async () => {
      const validationRequest = {
        access_token: memberAccessToken,
      } satisfies IRedditLikeAuthSession.IValidate;

      const validationResult: IRedditLikeAuthSession.IValidationResult =
        await api.functional.redditLike.auth.session.validate(connection, {
          body: validationRequest,
        });

      // If we reach here, the validation incorrectly succeeded
      // The test expects this operation to throw an error
      typia.assert(validationResult);
    },
  );
}
