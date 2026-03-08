import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_tracking_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration with random credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const customerCredentials: IEcommerceMallCustomer.ILogin = {
    email: joinEmail,
    password: joinPassword,
  } satisfies IEcommerceMallCustomer.ILogin;
  const customerLoggedIn = await authorize_customer_login(loginConnection, {
    body: customerCredentials,
  });
  typia.assert(customerLoggedIn);
  // 3. Create authenticated connection with Bearer token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: `Bearer ${customerLoggedIn.token.access}`,
  };
  // 4. Query shipments for customer
  const shipmentsResponse =
    await api.functional.ecommerceMall.customer.shipments.index(
      authenticatedConnection,
      { body: {} },
    );
  typia.assert(shipmentsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    shipmentsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    shipmentsResponse.pagination.limit >= 10 &&
      shipmentsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    shipmentsResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation correct",
    shipmentsResponse.pagination.pages,
    shipmentsResponse.pagination.records > 0
      ? Math.ceil(
          shipmentsResponse.pagination.records /
            shipmentsResponse.pagination.limit,
        )
      : 0,
  );
  // 6. If shipments exist, validate data structure and sorting
  if (shipmentsResponse.data.length > 0) {
    // Validate sorting: first item should have oldest or newest createdAt based on default (descending = newest first)
    let previousCreatedAt: string | undefined = undefined;
    for (const shipment of shipmentsResponse.data) {
      typia.assert(shipment);
      // Validate shipment ID is UUID
      TestValidator.predicate(
        "shipment id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          shipment.id,
        ),
      );
      // Validate tracking information visibility
      TestValidator.equals(
        "shipment carrier_name is string",
        typeof shipment.carrier_name,
        "string",
      );
      TestValidator.equals(
        "shipment tracking_number is string",
        typeof shipment.tracking_number,
        "string",
      );
      // Validate timestamps
      TestValidator.equals(
        "shipment created_at is date-time",
        typeof shipment.created_at,
        "string",
      );
      TestValidator.equals(
        "shipment updated_at is date-time",
        typeof shipment.updated_at,
        "string",
      );
      // Validate deleted_at can be null or undefined
      if (shipment.deleted_at !== undefined) {
        TestValidator.predicate(
          "shipment deleted_at is null or string",
          shipment.deleted_at === null ||
            typeof shipment.deleted_at === "string",
        );
      }
      // Validate order reference exists and has required fields
      typia.assert(shipment.order);
      TestValidator.equals(
        "order id is string",
        typeof shipment.order.id,
        "string",
      );
      TestValidator.equals(
        "order order_number is string",
        typeof shipment.order.order_number,
        "string",
      );
      TestValidator.equals(
        "order total_price is number",
        typeof shipment.order.total_price,
        "number",
      );
      TestValidator.equals(
        "order overall_status is string",
        typeof shipment.order.overall_status,
        "string",
      );
      TestValidator.equals(
        "order created_at is string",
        typeof shipment.order.created_at,
        "string",
      );
      TestValidator.equals(
        "order updated_at is string",
        typeof shipment.order.updated_at,
        "string",
      );
      TestValidator.predicate(
        "order deleted_at is null or string",
        shipment.order.deleted_at === null ||
          typeof shipment.order.deleted_at === "string",
      );
      // Validate seller reference exists and has required fields
      typia.assert(shipment.seller);
      TestValidator.equals(
        "seller id is string",
        typeof shipment.seller.id,
        "string",
      );
      TestValidator.equals(
        "seller email is string",
        typeof shipment.seller.email,
        "string",
      );
      TestValidator.predicate(
        "seller approval_status is valid",
        ["pending", "approved", "rejected"].includes(
          shipment.seller.approval_status,
        ),
      );
      TestValidator.equals(
        "seller is_suspended is boolean",
        typeof shipment.seller.is_suspended,
        "boolean",
      );
      TestValidator.equals(
        "seller is_banned is boolean",
        typeof shipment.seller.is_banned,
        "boolean",
      );
      TestValidator.equals(
        "seller created_at is string",
        typeof shipment.seller.created_at,
        "string",
      );
      // Validate sorting: createdAt should be in descending order (default)
      if (previousCreatedAt !== undefined) {
        TestValidator.predicate(
          "shipments sorted by createdAt descending",
          new Date(shipment.created_at).getTime() <=
            new Date(previousCreatedAt).getTime(),
        );
      }
      previousCreatedAt = shipment.created_at;
    }
  } else {
    // Empty shipments case - validate pagination still correct
    TestValidator.equals(
      "pagination records is 0 when no shipments",
      shipmentsResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination pages is 0 when no shipments",
      shipmentsResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "pagination data is empty array",
      shipmentsResponse.data.length,
      0,
    );
  }
}
