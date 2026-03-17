import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_order(
  input?: DeepPartial<IEcommerceMallOrder.ICreate>,
): IEcommerceMallOrder.ICreate {
  return {
    shipping_recipient_name:
      input?.shipping_recipient_name ?? RandomGenerator.name(),
    shipping_phone_number:
      input?.shipping_phone_number ?? RandomGenerator.mobile(),
    shipping_street_address:
      input?.shipping_street_address ??
      RandomGenerator.paragraph({ sentences: 1 }),
    shipping_city: input?.shipping_city ?? RandomGenerator.name(1),
    shipping_state: input?.shipping_state ?? RandomGenerator.name(1),
    shipping_postal_code:
      input?.shipping_postal_code ?? RandomGenerator.alphaNumeric(10),
    shipping_country: input?.shipping_country ?? RandomGenerator.name(2),
    address_id:
      input?.address_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
