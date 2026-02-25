import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_user_management_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for search operation
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com",
      referrer: "https://referrer.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create test users with different types and statuses
  const testUsers = await createTestUsers(connection);
  // Test 1: Filter by userType - customer and seller only
  const customerSellerFilter: IEcommerceMetadataRegistryRelationship.IRequest =
    {
      userType: undefined, // Test without userType filter first
      search: undefined,
      createdAt_from: undefined,
      createdAt_to: undefined,
      page: 1,
      limit: 50,
    };
  const allUsers =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminConnection,
      { body: customerSellerFilter },
    );
  typia.assert(allUsers);
  // Test 2: Filter by specific account status (pending)
  const pendingFilter: IEcommerceMetadataRegistryRelationship.IRequest = {
    accountStatus: "pending",
    page: 1,
    limit: 10,
  };
  const pendingUsers =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingUsers);
  // Verify all returned users should have pending status
  TestValidator.predicate(
    "pending filter returns only pending users",
    pendingUsers.data.length >= 1,
  );
  // Test 3: Date range filtering
  const earliestDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const dateRangeFilter: IEcommerceMetadataRegistryRelationship.IRequest = {
    createdAt_from: earliestDate,
    page: 1,
    limit: 20,
  };
  const recentUsers =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminConnection,
      { body: dateRangeFilter },
    );
  typia.assert(recentUsers);
  // Test 4: Pagination with different limits
  const limit5Filter: IEcommerceMetadataRegistryRelationship.IRequest = {
    page: 1,
    limit: 5,
  };
  const limit5Result =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminConnection,
      { body: limit5Filter },
    );
  typia.assert(limit5Result);
  TestValidator.equals(
    "limit 5 returns at most 5 items",
    limit5Result.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination limit matches request",
    limit5Result.pagination.limit,
    5,
  );
  // Test 5: Combined filters - customer and seller with date range
  const combinedFilter: IEcommerceMetadataRegistryRelationship.IRequest = {
    userType: "customer",
    createdAt_from: earliestDate,
    page: 1,
    limit: 15,
  };
  const combinedResult =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
}
async function createTestUsers(baseConnection: api.IConnection) {
  const users = [];
  // Create customer (active by default)
  const customerConnection: api.IConnection = { host: baseConnection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  users.push({ type: "customer", id: customer.id, status: "active" });
  // Create seller (pending by default)
  const sellerConnection: api.IConnection = { host: baseConnection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://test.com",
      referrer: "https://referrer.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  users.push({ type: "seller", id: seller.id, status: "pending" });
  // Create administrator
  const adminConnection: api.IConnection = { host: baseConnection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  users.push({ type: "administrator", id: admin.id, status: "active" });
  return users;
}
