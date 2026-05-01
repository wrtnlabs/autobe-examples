import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall order item product snapshot image creation data for E2E testing.
 *
 * Generates a complete IShoppingMallOrderItemProductSnapshotImage.ICreate with randomized values.
 * The image URL is frozen in the snapshot at purchase time and remains as an authoritative record
 * regardless of later changes to the original product image.
 */
export function prepare_random_shopping_mall_order_item_product_snapshot_image(
  input?:
    | DeepPartial<IShoppingMallOrderItemProductSnapshotImage.ICreate>
    | undefined,
): IShoppingMallOrderItemProductSnapshotImage.ICreate {
  return {
    image_url: input?.image_url ?? typia.random<string & tags.Format<"url">>(),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
