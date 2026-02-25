import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Product creation
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create date range for testing
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 30);
  const endDate = now;
  // 4. Call the snapshot endpoint with date range
  const response = await api.functional.ecommerce.products.snapshots.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IEcommerceProductSnapshot.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate response contains at least one snapshot (the initial product state)
  TestValidator.equals("Snapshot count should be 1", response.data.length, 1);
  // 6. Verify the snapshot contains the product's initial state
  const initialSnapshot = response.data[0];
  TestValidator.equals(
    "Snapshot name matches",
    initialSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "Snapshot description matches",
    initialSnapshot.description,
    product.description,
  );
  TestValidator.equals(
    "Snapshot base price matches",
    initialSnapshot.base_price,
    product.base_price,
  );
}
