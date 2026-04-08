import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce shipping address creation data for E2E testing.
 *
 * Generates a complete IEcommerceAddress.ICreate with randomized values for recipient name,
 * phone number, street address, city, state (nullable), postal code, country, and default flag.
 * Supports partial input overrides through DeepPartial for test customization.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete IEcommerceAddress.ICreate with all required and optional fields
 */
export function prepare_random_ecommerce_address(
  input?: DeepPartial<IEcommerceAddress.ICreate>,
): IEcommerceAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 2 }),
    city: input?.city ?? RandomGenerator.name(),
    state:
      input?.state !== undefined
        ? input.state
        : Math.random() < 0.3
          ? null
          : RandomGenerator.name(),
    postal_code: input?.postal_code ?? RandomGenerator.alphabets(5),
    country: input?.country ?? RandomGenerator.name(),
    is_default: input?.is_default ?? Math.random() < 0.2,
  };
}
