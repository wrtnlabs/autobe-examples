import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_email_verifications_create_email_verification } from "../../../generate/generate_random_community_platform_user_email_verifications_create_email_verification";
import { prepare_random_community_platform_user_email_verification } from "../../../prepare/prepare_random_community_platform_user_email_verification";

export async function test_api_user_email_verification_create_success_and_idempotency(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1 & 2: Successful Email Verification Creation & Idempotent Resend
  // 1. Authorize as user by creating user account
  const baseConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(baseConnection, {});
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // Store created verifications for different emails
  const verifications: Record<string, ICommunityPlatformUserEmailVerification> =
    {};

  // Scenario 1: Create unique verifications
  for (let i = 0; i < 3; ++i) {
    const email = typia.random<string & tags.Format<"email">>();
    const verification =
      await api.functional.communityPlatform.user.email_verifications.createEmailVerification(
        userConnection,
        {
          body: {
            email,
          } as unknown as ICommunityPlatformUserEmailVerification.ICreate,
        },
      );
    typia.assert(verification);
    TestValidator.predicate(
      "is_verified flag is false",
      verification.is_verified === false,
    );
    TestValidator.predicate(
      "expires_at is valid date",
      Boolean(new Date(verification.expires_at).getTime()),
    );
    TestValidator.predicate(
      "token is string",
      typeof verification.token === "string",
    );
    verifications[email] = verification;
  }

  // Scenario 2: Idempotent resend
  const emails = Object.keys(verifications);
  if (emails.length === 0)
    throw new Error("No email verifications created for idempotency test");
  const existingEmail = emails[0];
  const firstVerification = verifications[existingEmail];
  const resentVerification =
    await api.functional.communityPlatform.user.email_verifications.createEmailVerification(
      userConnection,
      {
        body: {
          email: existingEmail,
        } as unknown as ICommunityPlatformUserEmailVerification.ICreate,
      },
    );
  typia.assert(resentVerification);
  TestValidator.equals(
    "token reused matches",
    resentVerification.token,
    firstVerification.token,
  );
  TestValidator.equals(
    "expires_at reused matches",
    resentVerification.expires_at,
    firstVerification.expires_at,
  );
}
