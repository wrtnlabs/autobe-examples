import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random seller admin request data for E2E testing.
 *
 * Generates a complete IEcommerceMallSellerAdminRequest.ICreate with randomized
 * values. The reason field contains a detailed explanation of why the seller
 * is requesting administrative privileges on the platform.
 *
 * This function is used to test the admin request submission flow where sellers
 * provide justification for needing elevated platform access.
 *
 * @param input - Optional DeepPartial input to override specific fields
 * @returns Complete ICreate object with randomized reason text
 */
export function prepare_random_ecommerce_mall_seller_admin_request(
  input?: DeepPartial<IEcommerceMallSellerAdminRequest.ICreate>,
): IEcommerceMallSellerAdminRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 5 }),
  };
}
