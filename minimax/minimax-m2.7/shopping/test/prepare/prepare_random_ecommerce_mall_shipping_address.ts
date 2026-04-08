import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_shipping_address(
  input?: DeepPartial<IEcommerceMallShippingAddress.ICreate>,
): IEcommerceMallShippingAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(),
    phone: input?.phone ?? RandomGenerator.mobile(),
    streetAddress:
      input?.streetAddress ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    state: input?.state ?? RandomGenerator.name(1),
    postalCode: input?.postalCode ?? RandomGenerator.alphaNumeric(6),
    country: input?.country ?? RandomGenerator.name(1),
    isDefault: input?.isDefault ?? (Math.random() > 0.5 ? true : false),
  };
}
