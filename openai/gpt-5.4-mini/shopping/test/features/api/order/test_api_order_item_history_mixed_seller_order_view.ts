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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_history_mixed_seller_order_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAt",
    order: "desc",
  } satisfies IMallPlatformOrderItem.IRequest;
  const first = await api.functional.mallPlatform.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body: request,
    },
  );
  typia.assert(first);
  const second = await api.functional.mallPlatform.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals("pagination current", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "pagination pages",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals("response stability", first, second);
  for (const item of first.data) {
    TestValidator.equals(
      "item parent order id stable",
      item.order.id,
      first.data[0]?.order.id ?? item.order.id,
    );
    TestValidator.predicate("item quantity is positive", item.quantity > 0);
    TestValidator.predicate("item status is non-empty", item.status.length > 0);
    TestValidator.predicate(
      "variant sku code is non-empty",
      item.productVariant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "variant option values are non-empty",
      item.productVariant.optionValues.length > 0,
    );
    TestValidator.predicate(
      "seller email is non-empty",
      item.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller status is non-empty",
      item.seller.status.length > 0,
    );
    TestValidator.predicate(
      "product name is non-empty",
      item.productVariant.product.name.length > 0,
    );
    TestValidator.predicate(
      "product description is non-empty",
      item.productVariant.product.description.length > 0,
    );
  }
}
