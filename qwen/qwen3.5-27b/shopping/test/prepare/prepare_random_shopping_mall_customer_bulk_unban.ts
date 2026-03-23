import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_customer_bulk_unban(
  input?: DeepPartial<IShoppingMallCustomerBulkUnban.ICreate> | undefined,
): IShoppingMallCustomerBulkUnban.ICreate {
  return {
    customerIds: input?.customerIds
      ? input.customerIds.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
