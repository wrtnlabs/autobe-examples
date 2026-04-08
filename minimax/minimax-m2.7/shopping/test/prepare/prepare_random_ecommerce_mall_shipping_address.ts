import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shipping address creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallShippingAddress.ICreate with randomized
 * values suitable for testing address creation, validation, and management
 * in the e-commerce mall platform.
 *
 * All required fields (recipient_name, phone, street_address, city, state,
 * postal_code, country) are generated with realistic test data. The optional
 * is_default field is randomly assigned when not provided by input.
 *
 * @param input - Optional DeepPartial override for specific fields
 * @returns Complete shipping address creation payload
 */
export function prepare_random_ecommerce_mall_shipping_address(
  input?: DeepPartial<IEcommerceMallShippingAddress.ICreate>,
): IEcommerceMallShippingAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone: input?.phone ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state ?? RandomGenerator.name(1),
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
        "Brazil",
        "India",
      ] as const),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
