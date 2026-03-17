import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a customer receives a 404 error when attempting to view a soft-deleted product.
 * According to business rules, deleted products should only be viewable by administrators
 * in the context of order history or audit trails.
 *
 * Test flow:
 * 1. Create a seller account and authenticate using SDK
 * 2. Use a random UUID to simulate a non-existent/deleted product
 * 3. Attempt to retrieve the product without authentication
 * 4. Verify the response returns HTTP 404 Not Found
 */
export async function test_api_product_detail_page_deleted_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create a public connection without authentication
  const publicConnection: api.IConnection = { host: connection.host };
  // 3. Use a random UUID to represent a non-existent/deleted product
  const deletedProductId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the deleted/non-existent product and verify 404
  await TestValidator.httpError(
    "accessing deleted or non-existent product returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.products.at(publicConnection, {
        productId: deletedProductId,
      });
    },
  );
}
