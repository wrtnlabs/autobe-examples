import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator refund request pagination for order items.
 *
 * Validates the pagination functionality of the admin refund request listing endpoint. The test authenticates as an administrator, then queries refund requests for a specific order item with various pagination parameters to ensure proper metadata and data retrieval.
 *
 * Special attention is given to verifying pagination metadata accuracy including current page number, limit, total records count, and total pages calculation. The test also validates the response structure conforms to the expected paginated summary format.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Calls refund request index endpoint with pagination parameters (page=1, limit=10).
 * 3. Validates pagination metadata contains correct current, limit, records, and pages values.
 * 4. Validates response data array structure and types.
 * 5. Tests with different pagination parameters (page=2, limit=5) to verify pagination logic.
 * 6. Validates that records count accurately reflects available refund requests (0 or 1 due to unique constraint).
 */
export async function test_api_admin_refund_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate test order and order item IDs (UUIDs)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test pagination with page=1, limit=10
  const page1Result: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.admin.orders.items.refund_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(page1Result);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", page1Result.pagination.current, 1);
  TestValidator.equals("limit is 10", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1Result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(page1Result.data));
  TestValidator.predicate(
    "data length matches records count",
    page1Result.data.length === page1Result.pagination.records,
  );
  // 6. Test pagination with page=2, limit=5
  const page2Result: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.admin.orders.items.refund_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  // 7. Validate second page metadata
  TestValidator.equals("current page is 2", page2Result.pagination.current, 2);
  TestValidator.equals("limit is 5", page2Result.pagination.limit, 5);
  TestValidator.predicate(
    "records count matches first page",
    page2Result.pagination.records === page1Result.pagination.records,
  );
  // 8. Validate records count reflects unique constraint (0 or 1)
  TestValidator.predicate(
    "records count is 0 or 1 due to unique constraint",
    page1Result.pagination.records === 0 ||
      page1Result.pagination.records === 1,
  );
}
