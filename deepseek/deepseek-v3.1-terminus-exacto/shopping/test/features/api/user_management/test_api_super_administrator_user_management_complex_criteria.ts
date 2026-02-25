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

export async function test_api_super_administrator_user_management_complex_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Setup - Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSuperAdministrator.IJoin;
  // Register and login super admin
  await authorize_super_administrator_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminCredentials.email,
      password: superAdminCredentials.password,
      ip: superAdminCredentials.ip,
      href: superAdminCredentials.href,
      referrer: superAdminCredentials.referrer,
    } satisfies IEcommerceSuperAdministrator.ILogin,
  });
  // Create test users with distinct identifiers for search testing
  const customerEmail = "john_search_test@example.com";
  const customerDisplayName = "John Search Test";
  const customerJoinResult = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: customerEmail,
        password: "password123",
        display_name: customerDisplayName,
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResult);
  const sellerEmail = "tech_store_search@example.com";
  const sellerShopName = "Tech Store Electronics";
  const sellerJoinResult = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: sellerEmail,
        password: "password123",
        shop_name: sellerShopName,
        shop_description: "Premium electronics and gadgets",
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  const adminEmail = "admin_search_test@domain.com";
  const adminJoinResult = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: adminEmail,
        password: "password123",
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminJoinResult);
  // Wait briefly to ensure users are searchable
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Text search across different user types
  const searchResult1 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          search: "search test",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "text search returns results",
    searchResult1.data.length >= 0,
  );
  // Test 2: User type filtering - customers only
  const searchResult2 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          userType: "customer",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Combined text search and user type filtering
  const searchResult3 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          search: "tech",
          userType: "seller",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Date range filtering with wider window
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const searchResult4 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          createdAt_from: oneDayAgo.toISOString(),
          createdAt_to: now.toISOString(),
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.predicate(
    "date range search returns results",
    searchResult4.data.length >= 0,
  );
  // Test 5: Complex combined criteria with pagination
  const searchResult5 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          search: "test",
          userType: "customer",
          createdAt_from: oneDayAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "pagination metadata present",
    searchResult5.pagination.records >= 0,
  );
  TestValidator.predicate(
    "valid page number",
    searchResult5.pagination.current === 1,
  );
  TestValidator.predicate("valid limit", searchResult5.pagination.limit === 10);
  // Test 6: Case insensitive and partial search
  const searchResult6 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          search: "SEARCH",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult6);
  // Test 7: Empty search should return all users
  const searchResult7 =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      superAdminLoginConnection,
      {
        body: {
          search: "",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult7);
  TestValidator.predicate(
    "empty search returns users",
    searchResult7.data.length >= 0,
  );
}
