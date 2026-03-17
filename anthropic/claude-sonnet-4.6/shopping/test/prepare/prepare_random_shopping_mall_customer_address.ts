import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_customer_address(
  input?: DeepPartial<IShoppingMallCustomerAddress.ICreate> | undefined,
): IShoppingMallCustomerAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(),
    phone: input?.phone ?? RandomGenerator.mobile(),
    addressLine1:
      input?.addressLine1 ?? RandomGenerator.paragraph({ sentences: 1 }),
    addressLine2:
      input?.addressLine2 !== undefined ? (input.addressLine2 ?? null) : null,
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state ?? RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(5),
    country:
      input?.country ??
      RandomGenerator.pick([
        "US",
        "KR",
        "JP",
        "GB",
        "DE",
        "FR",
        "CA",
        "AU",
        "CN",
        "BR",
      ] as const),
    isDefault: input?.isDefault ?? RandomGenerator.pick([true, false] as const),
  };
}
