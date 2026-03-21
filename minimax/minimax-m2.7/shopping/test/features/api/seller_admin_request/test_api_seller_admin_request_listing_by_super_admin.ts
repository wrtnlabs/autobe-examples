import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_admin_request_listing_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve paginated list of seller admin requests
  const page1 =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "page1.current is valid number",
    typeof page1.pagination.current,
    "number",
  );
  TestValidator.equals(
    "page1.limit is valid number",
    typeof page1.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "page1.records is valid number",
    typeof page1.pagination.records,
    "number",
  );
  TestValidator.equals(
    "page1.pages is valid number",
    typeof page1.pagination.pages,
    "number",
  );
  TestValidator.predicate(
    "pagination values non-negative",
    page1.pagination.current >= 0 &&
      page1.pagination.limit >= 0 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.equals("data is array", Array.isArray(page1.data), true);
  // 5. If data exists, validate each item structure
  for (const request of page1.data) {
    typia.assert(request);
    // Validate required fields exist
    TestValidator.equals("request has id", typeof request.id, "string");
    TestValidator.equals(
      "request has created_at",
      typeof request.created_at,
      "string",
    );
    TestValidator.equals("request has reason", typeof request.reason, "string");
    TestValidator.equals("request has status", typeof request.status, "string");
    // Validate seller reference
    TestValidator.equals("request has seller", typeof request.seller, "object");
    TestValidator.equals("seller has id", typeof request.seller.id, "string");
    TestValidator.equals(
      "seller has email",
      typeof request.seller.email,
      "string",
    );
    TestValidator.equals(
      "seller has approval_status",
      typeof request.seller.approval_status,
      "string",
    );
    TestValidator.equals(
      "seller has created_at",
      typeof request.seller.created_at,
      "string",
    );
    TestValidator.equals(
      "seller has profile",
      typeof request.seller.profile,
      "object",
    );
  }
  // 6. Test filtering by status (pending)
  const pendingRequests =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // If pending requests exist, validate all are pending
  for (const request of pendingRequests.data) {
    TestValidator.equals("status is pending", request.status, "pending");
  }
  // 7. Test second page pagination
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
        superAdminConnection,
        {
          body: {
            page: 2,
            limit: page1.pagination.limit,
          } satisfies IEcommerceMallSellerAdminRequest.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page2.current is 2", page2.pagination.current, 2);
    TestValidator.equals(
      "page2.limit matches request",
      page2.pagination.limit,
      page1.pagination.limit,
    );
    TestValidator.equals(
      "page2.records same as page1",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "page2.pages same as page1",
      page2.pagination.pages,
      page1.pagination.pages,
    );
  }
  // 8. Validate ordering (created_at descending - newest first)
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i].created_at).getTime();
      const next = new Date(page1.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `item ${i} created_at >= item ${i + 1} created_at`,
        current >= next,
      );
    }
  }
}
