import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_history_visibility_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const otherCustomerPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const administratorPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: "https://example.com/customers/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: otherCustomerEmail,
      password: otherCustomerPassword,
      href: "https://example.com/customers/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAt",
    search: "",
  } satisfies IShoppingMallOrderItemSnapshot.IRequest;
  await TestValidator.error(
    "unrelated customer cannot access order item snapshots",
    async () => {
      await api.functional.shoppingMall.customer.orderItems.snapshots.index(
        otherCustomerConnection,
        {
          orderItemId,
          body: request,
        },
      );
    },
  );
  const sellerHistory =
    await api.functional.shoppingMall.customer.orderItems.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(sellerHistory);
  const administratorHistory =
    await api.functional.shoppingMall.customer.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(administratorHistory);
  const ownerHistory =
    await api.functional.shoppingMall.customer.orderItems.snapshots.index(
      ownerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(ownerHistory);
  TestValidator.equals(
    "snapshot page limit is preserved",
    ownerHistory.pagination.limit,
    10,
  );
}
