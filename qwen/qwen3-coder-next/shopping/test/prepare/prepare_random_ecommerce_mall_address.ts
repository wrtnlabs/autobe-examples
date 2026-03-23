import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_address(
  input?: DeepPartial<IEcommerceMallAddress.ICreate> | undefined,
): IEcommerceMallAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(2),
    phone_number: input?.phone_number ?? RandomGenerator.mobile("010"),
    street_address:
      input?.street_address ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
