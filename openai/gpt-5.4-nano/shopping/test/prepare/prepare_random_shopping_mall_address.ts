import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_address(
  input?: DeepPartial<IShoppingMallAddress.ICreate> | undefined,
): IShoppingMallAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    postal_code: input?.postal_code ?? RandomGenerator.alphabets(6),
    country:
      input?.country ??
      RandomGenerator.pick([
        "South Korea",
        "United States",
        "Japan",
        "Canada",
        "Germany",
      ] as const),
    city:
      input?.city ??
      RandomGenerator.pick([
        "Seoul",
        "New York",
        "Tokyo",
        "Toronto",
        "Berlin",
      ] as const),
    street_line1:
      input?.street_line1 ??
      `${RandomGenerator.alphabets(2)} ${RandomGenerator.alphabets(3)}-${RandomGenerator.alphabets(2)}`,
    street_line2:
      input?.street_line2 === null ? null : (input?.street_line2 ?? null),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
