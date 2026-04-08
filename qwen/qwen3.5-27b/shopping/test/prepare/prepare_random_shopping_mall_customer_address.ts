import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random customer address data for E2E testing.
 *
 * Generates a complete IShoppingMallCustomerAddress.ICreate with randomized values
 * for shipping address information. All address components are included to support
 * international shipping scenarios.
 */
export function prepare_random_shopping_mall_customer_address(
  input?: DeepPartial<IShoppingMallCustomerAddress.ICreate>,
): IShoppingMallCustomerAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 4 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? null,
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
  };
}
