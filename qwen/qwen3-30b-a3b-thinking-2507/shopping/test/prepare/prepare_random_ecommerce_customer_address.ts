import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_customer_address(
  input?: DeepPartial<IEcommerceCustomerAddress.ICreate>,
): IEcommerceCustomerAddress.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone:
      input?.phone ??
      typia.random<
        string & tags.Pattern<"^\\+[0-9]{1,3}(?:[\\s.-]?[0-9]){6,14}$">
      >(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(),
    state: input?.state ?? RandomGenerator.name(),
    postal_code:
      input?.postal_code ??
      typia
        .random<number & tags.Minimum<10000> & tags.Maximum<99999>>()
        .toString(),
    country: input?.country ?? RandomGenerator.name(),
  };
}
