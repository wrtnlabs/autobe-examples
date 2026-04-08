import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
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

export async function test_api_order_item_list_mixed_status_individual_items(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string,
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "customer order contains multiple preserved items",
    order.orderItems.length >= 2,
  );
  const page =
    await api.functional.mallPlatform.administrator.orders.orderItems.index(
      administratorConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "administrator sees the same number of item rows as the order detail",
    page.data.length === order.orderItems.length,
  );
  const expectedIds = order.orderItems.map((item) => item.id);
  const actualIds = page.data.map((item) => item.id);
  TestValidator.equals(
    "order item ids are preserved independently",
    actualIds,
    expectedIds,
  );
  for (let index = 0; index < page.data.length; ++index) {
    const adminItem = page.data[index];
    const customerItem = order.orderItems[index];
    TestValidator.equals(
      "item order linkage is preserved",
      adminItem.order.id,
      order.id,
    );
    TestValidator.equals(
      "item status is preserved per row",
      adminItem.status,
      customerItem.status,
    );
    TestValidator.equals(
      "item quantity is preserved per row",
      adminItem.quantity,
      customerItem.quantity,
    );
    TestValidator.equals(
      "item variant is preserved per row",
      adminItem.productVariant.id,
      customerItem.productVariant.id,
    );
    TestValidator.equals(
      "item seller is preserved per row",
      adminItem.seller.id,
      customerItem.seller.id,
    );
  }
  TestValidator.predicate(
    "mixed-item order keeps independent rows rather than merging lifecycle state",
    page.data.length < 2 ||
      page.data.some(
        (item, index) => item.status !== page.data[0].status || index === 0,
      ),
  );
}
