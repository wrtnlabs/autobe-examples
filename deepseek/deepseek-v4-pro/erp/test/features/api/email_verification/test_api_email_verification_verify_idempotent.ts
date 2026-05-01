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
 * Test idempotent behavior of email verification endpoint.
 *
 * Validates that submitting an already-consumed verification token returns a success response rather than an error, confirming the endpoint's idempotent behavior as specified in the requirements. The test ensures that re-submitting an already-verified token is treated as a no-op success, preventing client errors when retrying after network timeouts or other transient failures.
 *
 * 1. Member account is created via join, generating an email verification token.
 * 2. First verification call consumes the token and populates verified_at.
 * 3. Second verification call with the same token returns success (idempotent).
 * 4. Assertions confirm the same record is returned with identical id, token, email, and verified_at.
 */
export async function test_api_email_verification_verify_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join (dependency)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. First verification call - consumes the token
  const firstVerification =
    await generate_random_erp_hrm_member_email_verifications_verify(
      memberConnection,
      { body: {} },
    );
  typia.assert(firstVerification);
  // 3. Second verification call with the same token (idempotent)
  const secondVerification =
    await generate_random_erp_hrm_member_email_verifications_verify(
      memberConnection,
      { body: { token: firstVerification.token } },
    );
  typia.assert(secondVerification);
  // 4. Assert idempotent behavior
  TestValidator.equals("same id", secondVerification.id, firstVerification.id);
  TestValidator.equals(
    "same token",
    secondVerification.token,
    firstVerification.token,
  );
  TestValidator.equals(
    "same email",
    secondVerification.email,
    firstVerification.email,
  );
  TestValidator.equals(
    "same verified_at",
    secondVerification.verified_at,
    firstVerification.verified_at,
  );
}
