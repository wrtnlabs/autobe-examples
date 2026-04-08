import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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

/**
 * Test that a seller with no shipments receives an empty data array and correct pagination metadata.
 *
 * Validates the empty state handling when a newly registered seller (who has not yet fulfilled any orders) lists their shipments. Verifies that:
 * - The data array is empty since no shipments have been created
 * - The pagination metadata correctly reflects zero records and zero pages
 * - All pagination fields are properly structured
 *
 * This test ensures that the shipments list endpoint gracefully handles the case where a seller has no shipment history, returning an empty list rather than an error or null response.
 *
 * 1. Register a new seller account using the authorization utility.
 * 2. Create a seller-specific connection with the authentication token.
 * 3. Call the shipments list endpoint for the authenticated seller.
 * 4. Validate that data is an empty array and pagination shows records=0, pages=0.
 */
export async function test_api_seller_shipments_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller with no shipments
  const sellerAuth = await authorize_seller_join(connection, {});
  // 2. Create seller-specific connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 3. Call the shipments list endpoint
  const shipments =
    await api.functional.ecommerceMall.seller.sellers.me.shipments.list(
      sellerConnection,
    );
  typia.assert(shipments);
  // 4. Validate empty state response
  TestValidator.equals("data array should be empty", shipments.data, []);
  TestValidator.equals("records should be 0", shipments.pagination.records, 0);
  TestValidator.equals("pages should be 0", shipments.pagination.pages, 0);
  TestValidator.predicate(
    "current page is valid",
    shipments.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", shipments.pagination.limit >= 0);
}
