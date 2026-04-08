import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform shipping address creation data for E2E testing.
 *
 * Generates a complete IMallPlatformShippingAddress.ICreate payload with realistic recipient and address details.
 * Caller-provided values override defaults, while omitted fields are filled with randomized but plausible data.
 */
export function prepare_random_mall_platform_shipping_address(
  input?: DeepPartial<IMallPlatformShippingAddress.ICreate> | undefined,
): IMallPlatformShippingAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(2),
    phoneNumber: input?.phoneNumber ?? RandomGenerator.mobile(),
    streetAddress:
      input?.streetAddress ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    stateProvince: input?.stateProvince ?? RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(6),
    country:
      input?.country ??
      RandomGenerator.pick([
        "United States",
        "South Korea",
        "Japan",
        "Canada",
        "Australia",
      ] as const),
    isDefault: input?.isDefault ?? false,
  };
}
