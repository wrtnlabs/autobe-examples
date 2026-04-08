import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_member_email_verification } from "../prepare/prepare_random_hrm_member_email_verification";

/**
 * Generate a random email verification token for a member account via the API.
 *
 * Creates an email verification record containing a cryptographically secure token
 * that can be used to verify the member's email address. The token is single-use
 * and expires after a configured duration (typically 24 hours).
 *
 * **Token Lifecycle**
 * - Token is generated and stored in the system
 * - Verification email is sent to the member's email address
 * - Token becomes invalid after expiration or after first use
 * - Previous tokens for the same member are invalidated when new token is created
 *
 * **Use Cases**
 * - Re-send verification email after initial registration
 * - Request new verification when previous token expired
 * - Trigger verification flow for unverified email addresses
 *
 * @param connection Connection information for the API server
 * @param props Optional properties for customization
 * @param props.body Optional partial data for the verification request
 * @returns The created email verification record with token and metadata
 */
export async function generate_random_hrm_member_member_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmMemberEmailVerification.ICreate> | undefined;
  },
): Promise<IHrmMemberEmailVerification> {
  const prepared: IHrmMemberEmailVerification.ICreate =
    prepare_random_hrm_member_email_verification(props.body);
  const result: IHrmMemberEmailVerification =
    await api.functional.hrm.member.member.email_verifications.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
