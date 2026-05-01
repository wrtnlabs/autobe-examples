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
 * Test retrieval of a verified email verification record after sign-up and email confirmation.
 *
 * Validates that after a member completes the sign-up process and verifies their email address, the email verification record can be retrieved by its unique identifier. The test confirms that the `verified_at` field is populated with a timestamp confirming successful email verification, while all other fields — token, email, expires_at, created_at, updated_at — remain intact and the member reference correctly identifies the authenticated member.
 *
 * 1. Member signs up through the join endpoint, creating a member account and generating an email verification token.
 * 2. The email verification token is consumed to confirm email ownership, populating the `verified_at` timestamp.
 * 3. The verification record is retrieved by its unique identifier.
 * 4. Validates that `verified_at` is populated (non-null) and the retrieved record matches the verification response.
 */
export async function test_api_email_verification_retrieve_verified(
  connection: api.IConnection,
) {
  // 1. Member signs up
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Verify email
  const verifiedRecord =
    await generate_random_erp_hrm_member_email_verifications_verify(
      memberConnection,
      {},
    );
  typia.assert(verifiedRecord);
  // 3. Retrieve verification record by ID
  const retrieved = await api.functional.erpHrm.member.email_verifications.at(
    memberConnection,
    { verificationId: verifiedRecord.id },
  );
  typia.assert(retrieved);
  // 4. Validate
  TestValidator.predicate(
    "verified_at should be populated",
    retrieved.verified_at !== null,
  );
  TestValidator.equals(
    "retrieved record matches verified record",
    retrieved,
    verifiedRecord,
  );
}
