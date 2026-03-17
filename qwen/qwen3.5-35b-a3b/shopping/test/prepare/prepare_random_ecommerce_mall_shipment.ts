import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_shipment(
  input?: DeepPartial<IEcommerceMallShipment.ICreate>,
): IEcommerceMallShipment.ICreate {
  return {
    order_item_ids: input?.order_item_ids
      ? input.order_item_ids.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.alphabets(6) +
        " " +
        RandomGenerator.alphabets(3) +
        "Express",
    carrier_phone:
      input?.carrier_phone ?? typia.random<string & tags.Format<"uri">>(),
    carrier_website:
      input?.carrier_website ??
      typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
    delivery_address:
      input?.delivery_address ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
