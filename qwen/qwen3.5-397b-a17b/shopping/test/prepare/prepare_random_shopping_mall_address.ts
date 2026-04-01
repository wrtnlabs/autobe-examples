import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_address(
  input?: DeepPartial<IShoppingMallAddress.ICreate>,
): IShoppingMallAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(),
    recipientPhone: input?.recipientPhone ?? RandomGenerator.mobile(),
    streetAddress:
      input?.streetAddress ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state ?? RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(5),
    country: input?.country ?? RandomGenerator.name(1),
    isDefault: input?.isDefault ?? false,
  };
}
