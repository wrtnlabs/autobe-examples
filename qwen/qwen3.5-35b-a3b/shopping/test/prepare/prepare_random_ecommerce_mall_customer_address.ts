import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_customer_address(
  input?: DeepPartial<IEcommerceMallCustomerAddress.ICreate>,
): IEcommerceMallCustomerAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone: input?.phone ?? RandomGenerator.mobile(),
    street:
      input?.street ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(5),
    country: input?.country ?? RandomGenerator.name(2),
    is_default: input?.is_default ?? typia.random<boolean>(),
  };
}
