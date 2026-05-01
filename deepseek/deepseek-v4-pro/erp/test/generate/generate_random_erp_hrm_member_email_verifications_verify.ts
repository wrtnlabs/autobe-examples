import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_member_email_verification } from "../prepare/prepare_random_erp_hrm_member_email_verification";

/**
 * Generate a verified email verification record by calling the verify endpoint for E2E testing.
 *
 * Prepares random verification token data using the prepare function, then calls the email
 * verification endpoint to consume the token. Upon successful verification, the system
 * automatically matches any pending organization invitations targeting the verified email
 * address and enrolls the user into those organizations.
 *
 * The verification is idempotent — submitting an already-verified token returns a success
 * response rather than an error. The returned record includes the `verified_at` timestamp
 * confirming when the email address was verified.
 */
export async function generate_random_erp_hrm_member_email_verifications_verify(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmMemberEmailVerification.ICreate>;
  },
): Promise<IErpHrmMemberEmailVerification> {
  const prepared: IErpHrmMemberEmailVerification.ICreate =
    prepare_random_erp_hrm_member_email_verification(props.body);
  const result: IErpHrmMemberEmailVerification =
    await api.functional.erpHrm.member.email_verifications.verify(connection, {
      body: prepared,
    });
  return result;
}
