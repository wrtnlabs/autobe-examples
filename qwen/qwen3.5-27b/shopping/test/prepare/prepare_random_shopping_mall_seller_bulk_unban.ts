import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_bulk_unban(
  input?: DeepPartial<IShoppingMallSellerBulkUnban.ICreate> | undefined,
): IShoppingMallSellerBulkUnban.ICreate {
  return {
    sellerIds: input?.sellerIds
      ? input.sellerIds.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
