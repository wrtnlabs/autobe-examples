import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall customer address creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCustomerAddress.ICreate with randomized
 * shipping address information including recipient details, full address
 * components, and optional default address flag.
 *
 * All properties support test-time customization through the DeepPartial input
 * parameter, allowing tests to override specific fields while auto-generating
 * the rest with realistic data.
 */
export function prepare_random_shopping_mall_customer_address(
  input?: DeepPartial<IShoppingMallCustomerAddress.ICreate>,
): IShoppingMallCustomerAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    recipient_phone: input?.recipient_phone ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(6),
    country:
      input?.country ??
      RandomGenerator.pick([
        "United States",
        "Canada",
        "United Kingdom",
        "Germany",
        "France",
        "Japan",
        "South Korea",
        "Australia",
      ] as const),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
