import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipping_address(
  input?: DeepPartial<IShoppingMallShippingAddress.ICreate> | undefined,
): IShoppingMallShippingAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(2),
    phoneNumber: input?.phoneNumber ?? RandomGenerator.mobile(),
    streetAddress:
      input?.streetAddress ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    stateProvince: input?.stateProvince ?? RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphabets(5).toUpperCase(),
    country: input?.country ?? RandomGenerator.name(1),
    isDefault: input?.isDefault ?? false,
  };
}
