import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random password reset request data for E2E testing.
 *
 * Generates a complete IErpHrmMemberPasswordReset.ICreate with a randomized
 * email address conforming to RFC 5322 format. The email is used to look up
 * the corresponding member account and deliver the reset token.
 *
 * For security testing, the caller can override the email via the input
 * parameter to test both registered and unregistered email scenarios —
 * the system always returns 204 No Content regardless of match result.
 */
export function prepare_random_erp_hrm_member_password_reset(
  input?: DeepPartial<IErpHrmMemberPasswordReset.ICreate>,
): IErpHrmMemberPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
