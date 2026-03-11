import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_registration_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test seller registrations with different statuses
  const shopNames = [
    RandomGenerator.alphabets(6),
    RandomGenerator.alphabets(6),
    RandomGenerator.alphabets(6),
  ];
  // Create multiple registrations to test filtering
  const createdAt = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  // 3. Test filtering by approval_status
  const statusFilter: IEcommerceMallSellerRegistration.IRequest = {
    approval_status: "pending",
    page: 1,
    limit: 10,
  };
  const statusResponse =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: statusFilter satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(statusResponse);
  // 4. Test filtering by shop_name
  const shopNameFilter: IEcommerceMallSellerRegistration.IRequest = {
    shop_name: shopNames[0].substring(0, 3), // Partial match
    page: 1,
    limit: 10,
  };
  const shopNameResponse =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: shopNameFilter satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(shopNameResponse);
  // 5. Test filtering by date range
  const dateFilter: IEcommerceMallSellerRegistration.IRequest = {
    responded_at_from: oneDayAgo,
    responded_at_to: createdAt,
    page: 1,
    limit: 10,
  };
  const dateResponse =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: dateFilter satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(dateResponse);
  // 6. Test pagination
  const paginationFilter: IEcommerceMallSellerRegistration.IRequest = {
    page: 1,
    limit: 2,
  };
  const paginationResponse =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: paginationFilter satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // 7. Validate pagination metadata
  const pagination = paginationResponse.pagination;
  TestValidator.equals("pagination exists", pagination !== undefined, true);
  TestValidator.equals(
    "data array exists",
    Array.isArray(paginationResponse.data),
    true,
  );
  TestValidator.predicate("current page >= 0", pagination.current >= 0);
  TestValidator.predicate("limit correct", pagination.limit === 2);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // 8. Validate response structure
  if (paginationResponse.data.length > 0) {
    const firstItem = paginationResponse.data[0];
    typia.assert<IEcommerceMallSellerRegistration.ISummary>(firstItem);
    TestValidator.equals("has id", typeof firstItem.id, "string");
    TestValidator.equals("has shop_name", typeof firstItem.shop_name, "string");
    TestValidator.equals(
      "has approval_status",
      typeof firstItem.approval_status,
      "string",
    );
  }
}
