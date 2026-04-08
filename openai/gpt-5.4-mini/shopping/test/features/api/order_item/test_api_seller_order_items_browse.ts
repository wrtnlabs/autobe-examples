import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Browse seller order items with pagination and default newest-first ordering.
 *
 * Validates that a newly authenticated seller can access the operational order-item browsing endpoint and receive a paginated summary page.
 *
 * This test checks the response shape for the required nested order, product-variant, and seller references, along with pagination metadata consistency and the default newest-first ordering behavior when no explicit sort is provided.
 *
 * 1. Authenticate a seller using the join utility and prepare a seller-scoped connection.
 * 2. Request the first page of seller order-item summaries with a small limit.
 * 3. Verify pagination metadata, nested summary references, and positive item fields.
 * 4. Confirm default ordering is newest-first when multiple records are returned.
 */
export async function test_api_seller_order_items_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const request = {
    page: 1,
    limit: 5,
  } satisfies IMallPlatformOrderItem.IRequest;
  const output = await api.functional.mallPlatform.seller.orderItems.index(
    sellerConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current should match requested page",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed the requested limit",
    output.data.length <= request.limit,
  );
  TestValidator.predicate(
    "returned page should be consistent with pagination metadata",
    output.pagination.pages === 0
      ? output.data.length === 0
      : output.pagination.current >= 1 &&
          output.pagination.current <= output.pagination.pages,
  );
  for (const item of output.data) {
    typia.assert(item);
    TestValidator.predicate(
      "order item quantity should be positive",
      item.quantity > 0,
    );
    TestValidator.predicate(
      "order item status should be populated",
      item.status.length > 0,
    );
    TestValidator.predicate(
      "order reference should include core summary fields",
      item.order.id.length > 0 && item.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "product variant reference should include core summary fields",
      item.productVariant.id.length > 0 &&
        item.productVariant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "seller reference should include core summary fields",
      item.seller.id.length > 0 && item.seller.email.length > 0,
    );
  }
  if (output.data.length >= 2) {
    const firstCreatedAt = new Date(output.data[0].created_at).getTime();
    const secondCreatedAt = new Date(output.data[1].created_at).getTime();
    TestValidator.predicate(
      "default sort should be newest first",
      firstCreatedAt >= secondCreatedAt,
    );
  }
}
