import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

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
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(8),
    country: input?.country ?? RandomGenerator.name(1),
  };
}
