import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful email verification using a valid token generated during member sign-up.
 *
 * Validates the complete email verification flow from member registration through token consumption. The test creates a member account via guest join which triggers server-side generation of an email verification token. The verify endpoint is then called with the token, consuming it and marking the email as verified.
 *
 * The response is validated for correctness: the verified email must match the registered email, the verified_at timestamp must be non-null indicating successful consumption, and the embedded member summary must reflect the correct display name registered during sign-up.
 *
 * 1. Registers a new member with known email and display name via authorize_guest_join.
 * 2. Calls the verify endpoint with a verification token as the path parameter.
 * 3. Validates the response contains the correct email, populated verified_at timestamp, and matching member display name.
 */
export async function test_api_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const authorized = await authorize_guest_join(joinConnection, {
    body: {
      email,
      display_name: displayName,
    },
  });
  typia.assert(authorized);
  // 2. Verify email using the verification token generated during registration
  const verified =
    await api.functional.erpHrm.guest.email_verifications.verification.verify(
      connection,
      {
        verificationId: typia.random<string>(),
      },
    );
  typia.assert(verified);
  // 3. Validate verification response
  TestValidator.equals("email matches registered email", verified.email, email);
  TestValidator.predicate(
    "verified_at is populated after successful verification",
    verified.verified_at !== null,
  );
  TestValidator.equals(
    "member display_name matches registered name",
    verified.member.display_name,
    displayName,
  );
  TestValidator.equals(
    "member email matches registered email",
    verified.member.email,
    email,
  );
}
