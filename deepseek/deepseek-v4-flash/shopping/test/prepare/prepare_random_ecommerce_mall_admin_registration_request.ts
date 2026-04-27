import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall admin registration request creation data for E2E testing.
 *
 * Generates a complete IECommerceMallAdminRegistrationRequest.ICreate with a
 * randomized reason text explaining why the requester wishes to become an
 * administrator. The reason is a non-empty string describing the motivation for
 * elevated privileges.
 *
 * @param input - Partial input to override generated values
 * @returns A complete IECommerceMallAdminRegistrationRequest.ICreate instance
 *   ready for API consumption
 */
export function prepare_random_ecommerce_mall_admin_registration_request(
  input?:
    | DeepPartial<IECommerceMallAdminRegistrationRequest.ICreate>
    | undefined,
): IECommerceMallAdminRegistrationRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
