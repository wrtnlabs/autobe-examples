import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_for_administrator_dispute_review(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAt_desc",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  const page =
    await api.functional.mallPlatform.customer.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "snapshot pagination current page",
    page.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "snapshot pagination limit",
    page.pagination.limit,
    request.limit ?? page.pagination.limit,
  );
  TestValidator.predicate(
    "snapshot pagination totals are non-negative",
    page.pagination.records >= 0 && page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history page size respects limit",
    page.data.length <= page.pagination.limit,
  );
  if (page.data.length > 0) {
    const snapshot = page.data[0];
    TestValidator.predicate("snapshot has identifier", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has preserved reason",
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
      "snapshot preserves variant SKU",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot preserves seller shop name",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot quantity is positive",
      snapshot.quantity > 0,
    );
    TestValidator.predicate(
      "snapshot unit price is non-negative",
      snapshot.unitPrice >= 0,
    );
    TestValidator.predicate(
      "snapshot line total is non-negative",
      snapshot.lineTotal >= 0,
    );
    TestValidator.predicate(
      "snapshot order item reference preserved",
      snapshot.orderItem.id.length > 0,
    );
    TestValidator.equals(
      "snapshot quantity matches order item quantity",
      snapshot.orderItem.quantity,
      snapshot.quantity,
    );
    TestValidator.predicate(
      "snapshot order item status preserved",
      snapshot.orderItem.status.length > 0,
    );
  }
}
