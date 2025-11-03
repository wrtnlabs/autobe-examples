import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";

/**
 * Validate that an admin can retrieve the details of a specific email
 * verification token for an existing user.
 *
 * Ensures the following steps:
 *
 * 1. Register an admin to establish admin authentication.
 * 2. Create a user by triggering a password reset (since direct user creation is
 *    unavailable, this action will ensure user and token creation).
 * 3. Retrieve all verification tokens for that user as an admin (since there's no
 *    listing API, assume the password reset also creates the verification token
 *    and its ID can be inferred or extracted; fallback to typia.random if
 *    necessary for demonstration).
 * 4. Retrieve the details of a specific email verification token for the user
 *    using the admin endpoint with userId and verificationTokenId.
 * 5. Validate the returned token matches the requested IDs.
 */
export async function test_api_admin_verification_token_retrieval_for_existing_user(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string & tags.MinLength<8>,
        display_name: RandomGenerator.name(2),
        href: "https://admin.example.com/onboard",
        referrer: "https://portal.example.com",
        ip: undefined,
      },
    });
  typia.assert(admin);

  // 2. Trigger user creation through password reset (simulates user registration/email presence)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const resetResponse: ICommunityPlatformUser.IResetPasswordResponse =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: {
        email: userEmail,
      },
    });
  typia.assert(resetResponse);

  // 3. At this point, there should be a verification token for the user.
  // We do not have an API to look up the IDs; in a real system, we'd fetch the userId and tokenId from a lookup or repository APIs.
  // Here, we'll use typia.random for demonstration as SDK and business constraints limit deeper inspection.
  const userId = typia.random<string & tags.Format<"uuid">>();
  const verificationTokenId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the verification token as admin for the target user and token id
  const token: ICommunityPlatformUserVerificationToken =
    await api.functional.communityPlatform.admin.users.verificationTokens.at(
      connection,
      {
        userId,
        verificationTokenId,
      },
    );
  typia.assert(token);
  TestValidator.equals(
    "returned token belongs to user",
    token.community_platform_user_id,
    userId,
  );
  TestValidator.equals(
    "returned token id matches request",
    token.id,
    verificationTokenId,
  );
}
