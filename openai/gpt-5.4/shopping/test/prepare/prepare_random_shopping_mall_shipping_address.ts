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
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
