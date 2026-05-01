import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order_item_product_snapshot_image } from "../prepare/prepare_random_shopping_mall_order_item_product_snapshot_image";

/**
 * Generate a random order item product snapshot image via the API for E2E testing.
 *
 * Prepares random snapshot image data using the prepare function, then calls the
 * creation endpoint to add the image record to the frozen product snapshot
 * associated with the specified order item. The product snapshot must already
 * exist (created at order placement time) before this function is called.
 *
 * The generated image record includes a randomized URL and display order position
 * within the snapshot's gallery. Since snapshot images are immutable once created,
 * this function produces an authoritative historical record of what the product
 * listing looked like at the time of purchase.
 *
 * @param connection - API connection to the backend server
 * @param props.body - Optional partial creation data to override random defaults
 * @param props.params.itemId - UUID of the order item whose product snapshot will receive the new image
 * @returns The newly created product snapshot image record with all fields populated
 */
export async function generate_random_shopping_mall_order_items_product_snapshot_images_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallOrderItemProductSnapshotImage.ICreate>
      | undefined;
    params: {
      itemId: string;
    };
  },
): Promise<IShoppingMallOrderItemProductSnapshotImage> {
  const prepared: IShoppingMallOrderItemProductSnapshotImage.ICreate =
    prepare_random_shopping_mall_order_item_product_snapshot_image(props.body);
  const result: IShoppingMallOrderItemProductSnapshotImage =
    await api.functional.shoppingMall.order_items.product_snapshot.images.create(
      connection,
      {
        body: prepared,
        itemId: props.params.itemId,
      },
    );
  return result;
}
