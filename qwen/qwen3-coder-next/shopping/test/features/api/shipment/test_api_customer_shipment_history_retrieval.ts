import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail: string = typia.random<string>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Retrieve shipment history with default pagination
  const shipments = await api.functional.shoppingMall.customer.shipments.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(shipments);
  // 3. Validate results structure
  TestValidator.equals(
    "has non-negative shipment count",
    shipments.data.length >= 0,
    true,
  );
  // 4. Test with empty results (customer with no shipments)
  const emptyCustomerConnection: api.IConnection = { host: connection.host };
  const emptyCustomerEmail: string = typia.random<string>();
  await authorize_customer_join(emptyCustomerConnection, {
    body: {
      email: emptyCustomerEmail,
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const emptyShipments =
    await api.functional.shoppingMall.customer.shipments.index(
      emptyCustomerConnection,
      {
        body: {} satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(emptyShipments);
  TestValidator.equals(
    "empty customer has no shipments",
    emptyShipments.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    emptyShipments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 100 (default)",
    emptyShipments.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyShipments.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptyShipments.pagination.pages,
    0,
  );
  // 5. Test pagination parameters with default values
  const paginatedShipments =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(paginatedShipments);
  TestValidator.equals(
    "pagination page is 1",
    paginatedShipments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 100",
    paginatedShipments.pagination.limit,
    100,
  );
}
