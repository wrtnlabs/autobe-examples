import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_respect_scope_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that customer shipment browsing stays within the authenticated
   * customer's scope and returns summary-only paginated results.
   *
   * This test registers two customer accounts and exercises the scoped shipment
   * browse endpoint from the perspective of the first customer. The assertions
   * focus on the response contract that is guaranteed by the available DTOs: a
   * paginated page of shipment summaries. It also verifies that when a customer
   * attempts to query by another customer's identifier, the response does not
   * leak cross-account shipment data.
   *
   * 1. Register two distinct customers.
   * 2. Browse shipments as the first customer using the scoped endpoint.
   * 3. Confirm the response is paginated and contains shipment summaries only.
   * 4. Attempt a cross-account scope query and ensure no other customer's data is exposed.
   */
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "P@ssw0rd123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}-other@test.com`,
      password: "P@ssw0rd123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerB);
  const shipments = await api.functional.mallPlatform.customer.shipments.index(
    customerAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        customerId: customerA.id,
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(shipments);
  TestValidator.predicate(
    "shipment browse returns pagination metadata",
    shipments.pagination.current >= 0 &&
      shipments.pagination.limit >= 0 &&
      shipments.pagination.records >= 0 &&
      shipments.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "shipment browse returns summary rows only",
    shipments.data.every(
      (shipment) => shipment.seller !== null && shipment.order !== null,
    ),
  );
  TestValidator.predicate(
    "shipment browse remains within the authenticated customer's scope",
    shipments.data.every(
      (shipment) => shipment.order.customer.id === customerA.id,
    ),
  );
  const crossScopeShipments =
    await api.functional.mallPlatform.customer.shipments.index(
      customerAConnection,
      {
        body: {
          page: 1,
          limit: 20,
          customerId: customerB.id,
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(crossScopeShipments);
  TestValidator.predicate(
    "cross-account shipment query does not expose another customer's records",
    crossScopeShipments.data.every(
      (shipment) => shipment.order.customer.id === customerA.id,
    ),
  );
}
