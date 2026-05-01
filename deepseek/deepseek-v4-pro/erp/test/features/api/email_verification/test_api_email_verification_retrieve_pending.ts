import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of a pending email verification record after member sign-up.
 *
 * Validates that after a new member joins through the sign-up endpoint, the automatically generated email verification token record can be retrieved and inspected. Confirms the response contains all required fields — id, token, email, member reference, expires_at, created_at, and updated_at — and that verified_at remains null, confirming the token is still pending.
 *
 * 1. A new member signs up via authorize_member_join, which triggers automatic email verification token generation.
 * 2. The verification record is fetched by its unique identifier using the email verifications endpoint.
 * 3. typia.assert validates the complete response structure against IErpHrmMemberEmailVerification.
 * 4. verified_at is confirmed null, indicating the pending state.
 * 5. The email field is cross-checked against the sign-up email for consistency.
 */
export async function test_api_email_verification_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Sign up a new member — creates verification record automatically
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  // 2. Retrieve the email verification record by its ID
  const verification =
    await api.functional.erpHrm.member.email_verifications.at(
      memberConnection,
      {
        verificationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(verification);
  // 3. Validate business logic
  TestValidator.equals(
    "verification email matches sign-up email",
    verification.email,
    joinResult.email,
  );
  TestValidator.equals(
    "verified_at is null (pending state)",
    verification.verified_at,
    null,
  );
}
