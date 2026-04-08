import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_variant_options_empty_page(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate browsing preserved variant options for an order item snapshot that yields an empty page.
   *
   * This test registers an authenticated customer and then requests the variant-option browse endpoint using UUID-scoped identifiers. It verifies that the service returns a valid paginated response with no data items and consistent pagination metadata, which is appropriate for immutable-history browsing and dispute review workflows.
   *
   * 1. Register a customer account and authenticate the session.
   * 2. Browse the variant-option history for a specific order item snapshot using normal pagination controls.
   * 3. Confirm the response is an empty page and retains pagination metadata.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.orderItems.snapshots.variantOptions.index(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sort: "createdAt",
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "empty variant option page should have no records",
    output.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page should be preserved",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be zero for an empty response",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero when no records exist",
    output.pagination.pages,
    0,
  );
}
