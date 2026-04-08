import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shipping address creation data for E2E testing.
 *
 * Generates a complete `IMallPlatformShippingAddress.ICreate` payload with
 * realistic default values while allowing every field to be overridden through
 * `DeepPartial` input.
 */
export function prepare_random_mall_platform_shipping_address(
  input?: DeepPartial<IMallPlatformShippingAddress.ICreate> | undefined,
): IMallPlatformShippingAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(2),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
    is_default: input?.is_default ?? false,
  };
}
