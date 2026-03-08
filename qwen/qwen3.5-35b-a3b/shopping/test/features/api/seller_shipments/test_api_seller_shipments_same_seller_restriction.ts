import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_same_seller_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins platform
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Seller B joins platform
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Create actor-specific connections with tokens
  const sellerAAuthConnection: api.IConnection = { host: connection.host };
  sellerAAuthConnection.headers = {
    Authorization: sellerA.token.access,
  };
  const sellerBAuthConnection: api.IConnection = { host: connection.host };
  sellerBAuthConnection.headers = {
    Authorization: sellerB.token.access,
  };
  // 4. Seller A queries shipments without sellerId filter
  const sellerAshipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerAAuthConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerAshipments);
  // 5. Verify Seller A only sees their own shipments (sellerId should match Seller A)
  const sellerAShipments = sellerAshipments.data;
  for (const shipment of sellerAShipments) {
    TestValidator.equals(
      "shipment sellerId matches Seller A",
      shipment.seller.id,
      sellerA.id,
    );
  }
  // 6. Seller A queries shipments with Seller B's UUID as sellerId filter
  const sellerAFilteredShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerAAuthConnection,
      {
        body: {
          sellerId: sellerB.id,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerAFilteredShipments);
  // 7. Verify Seller A cannot access Seller B's shipments (should be empty or filtered)
  TestValidator.equals(
    "Seller A cannot access Seller B's shipments",
    sellerAFilteredShipments.data.length,
    0,
  );
  // 8. Seller B queries shipments without sellerId filter
  const sellerBShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerBAuthConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerBShipments);
  // 9. Verify Seller B only sees their own shipments
  for (const shipment of sellerBShipments.data) {
    TestValidator.equals(
      "shipment sellerId matches Seller B",
      shipment.seller.id,
      sellerB.id,
    );
  }
  // 10. Seller B queries with Seller A's UUID as sellerId filter
  const sellerBFilteredShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerBAuthConnection,
      {
        body: {
          sellerId: sellerA.id,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerBFilteredShipments);
  // 11. Verify Seller B cannot access Seller A's shipments
  TestValidator.equals(
    "Seller B cannot access Seller A's shipments",
    sellerBFilteredShipments.data.length,
    0,
  );
  // 12. Verify pagination metadata is correct
  TestValidator.predicate(
    "Seller A pagination is valid",
    () =>
      sellerAshipments.pagination.pages >= 0 &&
      sellerAshipments.pagination.records >= 0 &&
      sellerAshipments.pagination.current >= 1 &&
      sellerAshipments.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Seller B pagination is valid",
    () =>
      sellerBShipments.pagination.pages >= 0 &&
      sellerBShipments.pagination.records >= 0 &&
      sellerBShipments.pagination.current >= 1 &&
      sellerBShipments.pagination.limit > 0,
  );
}
