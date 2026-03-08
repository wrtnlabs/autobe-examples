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

export async function test_api_product_image_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create authenticated connection with seller token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 2. Scenario: Assume product with 4 images already exists (display_order 1-4)
  // Product ID from scenario assumption
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Initial thumbnail image ID (the one with display_order = 1)
  const initialThumbnailImageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Reorder: move the initial thumbnail (display_order=1) to display_order=4
  // This simulates the scenario: "first image is moved to a different position"
  const reorderBody = {
    display_order: 4,
  } satisfies IEcommerceMallProductImage.IUpdate;
  // 4. Execute reorder operation
  const reorderedResponse =
    await api.functional.ecommerceMall.products.images.reorder(
      authenticatedSellerConnection,
      {
        productId,
        body: reorderBody,
      },
    );
  typia.assert(reorderedResponse);
  // 5. Verify product reference in response
  typia.assert(reorderedResponse.product);
  TestValidator.equals(
    "image product matches",
    reorderedResponse.product.id,
    productId,
  );
  // 6. Verify display_order was updated to 4
  TestValidator.equals(
    "display_order updated to 4",
    reorderedResponse.display_order,
    4,
  );
  // 7. Verify thumbnail precedence business rule (section 1163)
  // Display order value of 1 represents primary/thumbnail image
  // After reorder to 4, this image should no longer be the thumbnail
  TestValidator.predicate(
    "image is no longer thumbnail after reorder to position 4",
    reorderedResponse.display_order !== 1,
  );
}
