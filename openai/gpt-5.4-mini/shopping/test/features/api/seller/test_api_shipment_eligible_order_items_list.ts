import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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
 * Test seller shipment eligibility list returns only the authenticated seller's eligible order items.
 *
 * Verifies that the eligible order-item listing is scoped to the logged-in seller, includes pagination metadata, and returns a compact item summary payload suitable for shipment creation. The test also checks that multiple results are ordered newest first.
 *
 * 1. Register a seller account and authenticate it through the seller join utility.
 * 2. Query the eligible-order-items endpoint using a seller-specific connection.
 * 3. Validate the paginated response structure and summary fields.
 * 4. Confirm each returned item belongs to the authenticated seller.
 * 5. Verify newest-first ordering when multiple items are present.
 */
export async function test_api_shipment_eligible_order_items_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.seller.shipments.eligible_order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata exists",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page is returned",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is returned",
    output.pagination.limit,
    10,
  );
  for (const item of output.data) {
    TestValidator.equals(
      "order item belongs to authenticated seller",
      item.seller.id,
      authorized.id,
    );
    TestValidator.predicate(
      "eligible item is active and visible in the response",
      item.deleted_at === null,
    );
  }
  for (let i = 1; i < output.data.length; ++i) {
    TestValidator.predicate(
      "eligible order items are newest first",
      output.data[i - 1].created_at >= output.data[i].created_at,
    );
  }
}
