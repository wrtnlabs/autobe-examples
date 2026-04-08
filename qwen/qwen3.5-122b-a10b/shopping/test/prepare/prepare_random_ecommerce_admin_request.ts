import { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce administrator request creation data for E2E testing.
 *
 * Generates a complete IEcommerceAdminRequest.ICreate with randomized values.
 * The function accepts optional input overrides through DeepPartial, allowing
 * test cases to customize specific fields while auto-generating the rest.
 *
 * @param input Optional partial input to override auto-generated values
 * @returns Complete IEcommerceAdminRequest.ICreate object ready for testing
 */
export function prepare_random_ecommerce_admin_request(
  input?: DeepPartial<IEcommerceAdminRequest.ICreate>,
): IEcommerceAdminRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 4 }),
  };
}
