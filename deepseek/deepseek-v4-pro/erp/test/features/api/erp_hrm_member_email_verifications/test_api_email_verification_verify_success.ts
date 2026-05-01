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
import { generate_random_erp_hrm_member_email_verifications_verify } from "../../../generate/generate_random_erp_hrm_member_email_verifications_verify";
import { prepare_random_erp_hrm_member_email_verification } from "../../../prepare/prepare_random_erp_hrm_member_email_verification";

/**
 * Test successful email verification after member registration.
 *
 * Validates the complete email verification flow where a newly registered member confirms their email address using the verification token generated during sign-up. The test ensures that upon successful verification, the response contains a properly populated verification record with a non-null verified_at timestamp and a valid member summary including identity fields.
 *
 * 1. A new member registers via the join endpoint, which automatically creates an email verification token in the database with verified_at set to null.
 * 2. The email verification endpoint is called to consume the token.
 * 3. Validates that the response contains a non-null verified_at timestamp, confirming the token was consumed, and that the member summary is properly populated with id, email, and display_name.
 */
export async function test_api_email_verification_verify_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (generates verification token)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Verify email address using the generated token
  const verifyConnection: api.IConnection = { host: connection.host };
  const verification =
    await generate_random_erp_hrm_member_email_verifications_verify(
      verifyConnection,
      {},
    );
  typia.assert(verification);
  // 3. Validate verification result
  TestValidator.predicate(
    "verified_at should be non-null",
    verification.verified_at !== null,
  );
  TestValidator.predicate(
    "member summary id should be populated",
    verification.member.id !== "",
  );
  TestValidator.predicate(
    "member summary email should be populated",
    verification.member.email !== "",
  );
  TestValidator.predicate(
    "member summary display_name should be populated",
    verification.member.display_name !== "",
  );
}
