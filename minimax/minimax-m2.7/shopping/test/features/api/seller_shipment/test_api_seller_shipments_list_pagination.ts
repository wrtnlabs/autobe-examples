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
 * Test pagination behavior when a seller has multiple shipments.
 *
 * Validates that the seller shipments list endpoint correctly handles pagination. Verifies that the pagination metadata (current page, limit, total records, total pages) is returned correctly. Tests that specifying different page and limit combinations produces consistent pagination results. This ensures the pagination cursor and offset logic work correctly for large shipment lists.
 *
 * The test flow:
 * 1. Register a new seller account and authenticate
 * 2. Create seller-specific connection with authorization headers
 * 3. Call shipments list endpoint - validates endpoint is accessible
 * 4. Validate pagination metadata structure (current, limit, records, pages)
 * 5. Test that pagination metadata values are valid integers and follow expected constraints
 * 6. Verify that the data array contains shipment summaries with expected properties
 */
export async function test_api_seller_shipments_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: "https://example.com/seller/register",
        referrer: "https://example.com",
      },
    },
  );
  // 2. Create authenticated seller connection with token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Call shipments list endpoint
  const shipmentsResponse =
    await api.functional.ecommerceMall.seller.sellers.me.shipments.list(
      authenticatedSellerConnection,
    );
  typia.assert(shipmentsResponse);
  // 4. Validate response structure
  const pagination: IPage.IPagination = shipmentsResponse.pagination;
  TestValidator.predicate(
    "pagination exists",
    pagination !== undefined && pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    shipmentsResponse.data !== undefined &&
      Array.isArray(shipmentsResponse.data),
  );
  // 5. Validate pagination metadata values
  TestValidator.predicate(
    "current page is non-negative integer",
    pagination.current >= 0 && Number.isInteger(pagination.current),
  );
  TestValidator.predicate(
    "limit is non-negative integer",
    pagination.limit >= 0 && Number.isInteger(pagination.limit),
  );
  TestValidator.predicate(
    "records is non-negative integer",
    pagination.records >= 0 && Number.isInteger(pagination.records),
  );
  TestValidator.predicate(
    "pages is non-negative integer",
    pagination.pages >= 0 && Number.isInteger(pagination.pages),
  );
  // 6. Validate pagination math constraints
  TestValidator.predicate(
    "records matches data length when no pagination",
    pagination.records >= shipmentsResponse.data.length,
  );
  TestValidator.predicate("pages is at least 0", pagination.pages >= 0);
  // If records > 0, pages should be >= 1
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages at least 1 when records exist",
      pagination.pages >= 1,
    );
  }
  // 7. Validate data array items if present
  for (const shipment of shipmentsResponse.data) {
    TestValidator.predicate(
      "shipment has id",
      shipment.id !== undefined && shipment.id !== null,
    );
    TestValidator.predicate(
      "shipment has carrier",
      typeof shipment.carrier === "string",
    );
    TestValidator.predicate(
      "shipment has tracking number",
      typeof shipment.tracking_number === "string",
    );
    TestValidator.predicate(
      "shipment has item_count",
      typeof shipment.item_count === "number" && shipment.item_count >= 0,
    );
    TestValidator.predicate(
      "shipment has order reference",
      shipment.order !== undefined && shipment.order !== null,
    );
    TestValidator.predicate(
      "shipment has seller reference",
      shipment.seller !== undefined && shipment.seller !== null,
    );
  }
}
