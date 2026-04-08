import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_images_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // sellerConnection.headers is updated internally by authorize_seller_join
  // 2. Generate product ID (simulated - actual product would be created via separate endpoint)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create reorder request with display_order
  // Note: SDK expects IReorder which has optional id field for single image reorder
  const reorderBody: IEcommerceMallProductImage.IReorder = {
    display_order: 1 satisfies number,
  } satisfies IEcommerceMallProductImage.IReorder;
  // 4. Call reorder endpoint
  const result =
    await api.functional.ecommerceMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId,
        body: reorderBody,
      },
    );
  // 5. Validate response structure
  typia.assert(result);
  // 6. Verify response has required fields
  TestValidator.equals(
    "display order updated",
    result.display_order,
    reorderBody.display_order,
  );
  TestValidator.equals(
    "product reference exists",
    result.product.id,
    productId,
  );
  TestValidator.predicate("has valid image url", result.image_url.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    result.created_at !== undefined,
  );
  TestValidator.predicate(
    "has sequential display order",
    result.display_order >= 1,
  );
}
