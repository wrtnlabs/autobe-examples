import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorEmailVerification";
import { prepare_random_community_platform_moderator_email_verification } from "../../../prepare/prepare_random_community_platform_moderator_email_verification";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_email_verification_resend(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new moderator account (unverified) - First moderator
  const moderatorConnection1: api.IConnection = { host: connection.host };
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(16);
  const moderator1 = await authorize_moderator_join(moderatorConnection1, {
    body: {
      email: email1,
      password: password1,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator1);
  // Step 2: Resend verification email - should generate a new token (unverified moderator)
  const verificationResponse: ICommunityPlatformModeratorEmailVerification.ICreate =
    await api.functional.communityPlatform.moderator.auth.moderators.email.resend.create(
      moderatorConnection1,
    );
  typia.assert(verificationResponse);
  // Validate response structure matches ICommunityPlatformModeratorEmailVerification.ICreate
  TestValidator.equals(
    "response has id",
    verificationResponse.id.length > 0,
    true,
  );
  TestValidator.equals(
    "response has token",
    verificationResponse.token.length > 0,
    true,
  );
  // Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO date-time",
    !isNaN(new Date(verificationResponse.created_at).getTime()),
  );
  TestValidator.predicate(
    "expires_at is ISO date-time",
    !isNaN(new Date(verificationResponse.expires_at).getTime()),
  );
  // Step 3: Resend verification email again - should not generate a new token (same moderator unverified)
  const verificationResponseAgain: ICommunityPlatformModeratorEmailVerification.ICreate =
    await api.functional.communityPlatform.moderator.auth.moderators.email.resend.create(
      moderatorConnection1,
    );
  typia.assert(verificationResponseAgain);
  // Validate same token is returned on second request for same unverified moderator
  TestValidator.equals(
    "token should be same on second resend",
    verificationResponse.token,
    verificationResponseAgain.token,
  );
  TestValidator.notEquals(
    "created_at should be different on second resend",
    verificationResponse.created_at,
    verificationResponseAgain.created_at,
  );
  // Step 4: Create a second moderator account (unverified) - for authorization test scenario
  const moderatorConnection2: api.IConnection = { host: connection.host };
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(16);
  const moderator2 = await authorize_moderator_join(moderatorConnection2, {
    body: {
      email: email2,
      password: password2,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator2);
  // Step 5: Login to verify the second moderator's credentials
  // Use captured email and password from moderator2 registration, not from response properties
  const loginConnection2: api.IConnection = { host: connection.host };
  const loggedinModerator2 = await authorize_moderator_login(loginConnection2, {
    body: {
      email: email2,
      password: password2,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(loggedinModerator2);
  // Step 6: Test that already verified moderator (login connection) cannot resend verification email
  await TestValidator.error(
    "already verified moderator cannot resend verification",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderators.email.resend.create(
        loginConnection2,
      );
    },
  );
  // Step 7: Test that non-moderator cannot access the endpoint (unauthenticated connection)
  const guestConnection: api.IConnection = { host: connection.host }; // Unauthenticated
  await TestValidator.error(
    "non-moderator cannot resend verification email",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderators.email.resend.create(
        guestConnection,
      );
    },
  );
}
