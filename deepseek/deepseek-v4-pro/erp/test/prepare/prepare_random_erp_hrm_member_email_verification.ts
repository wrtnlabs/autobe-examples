import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random email verification data for E2E testing.
 *
 * Generates a complete IErpHrmMemberEmailVerification.ICreate with a
 * randomized verification token. The token is a 32-character alphanumeric
 * string approximating the uniqueness and security characteristics of real
 * verification tokens used in production.
 *
 * The generated value is overridable via the DeepPartial input parameter,
 * allowing tests to specify particular tokens for scenarios such as
 * invalid token rejection, expired token handling, or idempotent
 * re-verification.
 */
export function prepare_random_erp_hrm_member_email_verification(
  input?: DeepPartial<IErpHrmMemberEmailVerification.ICreate>,
): IErpHrmMemberEmailVerification.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
  };
}
