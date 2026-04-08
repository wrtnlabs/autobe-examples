import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_shipments_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test admin order shipments retrieval with pagination.
   *
   * Validates the admin endpoint for retrieving paginated shipments associated with a specific order. Ensures that administrators can successfully authenticate and access shipment tracking information including carrier details, tracking numbers, and delivery status.
   *
   * The test verifies the complete response structure including pagination metadata and shipment summaries with all required fields such as tracking information, timestamps, and related order/seller references.
   *
   * 1. Administrator registers and authenticates via /ecommerce/auth/admin/join
   * 2. Admin calls shipments index endpoint with order ID and pagination parameters
   * 3. Validates response contains IPageIEcommerceShipment.ISummary structure
   * 4. Verifies pagination metadata includes current page, limit, records, and pages
   * 5. Validates shipment summaries contain all required fields when data exists
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with authorization token
  const adminConn: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Generate random order ID for testing
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Call shipments index endpoint with pagination
  const shipments: IPageIEcommerceShipment.ISummary =
    await api.functional.ecommerce.admin.orders.shipments.index(adminConn, {
      orderId,
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IEcommerceShipment.IRequest,
    });
  typia.assert(shipments);
  // 5. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    shipments.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    shipments.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    shipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    shipments.pagination.pages >= 0,
  );
  // 6. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(shipments.data));
  // 7. If shipments exist, validate shipment structure
  if (shipments.data.length > 0) {
    const shipment = shipments.data[0];
    typia.assert(shipment);
    // Validate nullable tracking_url with proper type narrowing
    if (shipment.tracking_url !== null && shipment.tracking_url !== undefined) {
      typia.assertGuard(shipment.tracking_url);
    }
    // Validate nullable delivered_at with proper type narrowing
    if (shipment.delivered_at !== null && shipment.delivered_at !== undefined) {
      typia.assertGuard(shipment.delivered_at);
    }
    // Validate order summary reference exists
    if (shipment.order !== null && shipment.order !== undefined) {
      typia.assertGuard(shipment.order);
    }
    // Validate seller summary reference exists
    if (shipment.seller !== null && shipment.seller !== undefined) {
      typia.assertGuard(shipment.seller);
    }
  }
}
