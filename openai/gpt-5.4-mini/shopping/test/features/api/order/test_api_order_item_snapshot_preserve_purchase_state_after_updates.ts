import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_preserve_purchase_state_after_updates(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa1234!@#",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const snapshot =
    await api.functional.mallPlatform.customer.orders.orderItems.snapshots.at(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot captured at exists",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason exists",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves product description",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves seller shop name",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves seller logo url",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves a positive quantity",
    snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot preserves a positive line total",
    snapshot.lineTotal > 0,
  );
  TestValidator.predicate(
    "snapshot variant options are preserved as a collection",
    Array.isArray(snapshot.variantOptions),
  );
  TestValidator.equals(
    "snapshot relation preserves parent id",
    snapshot.orderItem.id,
    snapshot.orderItem.id,
  );
}
