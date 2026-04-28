import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform shipping address creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformShippingAddress.ICreate with randomized values
 * including recipient name, phone number, street address, city, state, postal code,
 * country, and default address flag.
 *
 * All properties can be overridden via the optional input parameter for targeted testing.
 */
export function prepare_random_ecommerce_platform_shipping_address(
  input?: DeepPartial<IEcommercePlatformShippingAddress.ICreate>,
): IEcommercePlatformShippingAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(),
    phoneNumber: input?.phoneNumber ?? RandomGenerator.mobile(),
    streetAddress:
      input?.streetAddress ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state ?? RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(5),
    country: input?.country ?? RandomGenerator.name(1),
    isDefault: input?.isDefault ?? typia.random<boolean>(),
  };
}
