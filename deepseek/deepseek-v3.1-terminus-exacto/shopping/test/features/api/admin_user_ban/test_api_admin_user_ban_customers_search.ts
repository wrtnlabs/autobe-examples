import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfCustomer";
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
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

export async function test_api_admin_user_ban_customers_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    },
  });
  // Create administrative user ban record
  const adminUserBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "customer",
          ban_reason: "Test ban reason",
          ban_duration_days: 30,
          appeal_status: "none",
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // Create multiple customer accounts for potential filtering
  const customerConnections: api.IConnection[] = [];
  const customerAccounts: IEcommerceCustomer.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customer123",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      },
    });
    typia.assert(customer);
    customerConnections.push(customerConnection);
    customerAccounts.push(customer);
  }
  // Test 1: Search with no filters to retrieve all customer bans
  const allBansResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(allBansResult);
  TestValidator.equals(
    "pagination metadata present",
    typeof allBansResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination properties",
    () =>
      allBansResult.pagination.current !== undefined &&
      allBansResult.pagination.limit !== undefined &&
      allBansResult.pagination.records !== undefined &&
      allBansResult.pagination.pages !== undefined,
  );
  // Test 2: Search with specific customer_id filter
  if (customerAccounts.length > 0) {
    const customerIdFilterResult =
      await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
        adminConnection,
        {
          adminUserBanId: adminUserBan.id,
          body: {
            customer_id: customerAccounts[0].id,
            page: 1,
            limit: 20,
          } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
        },
      );
    typia.assert(customerIdFilterResult);
    // The result might be empty if no bans exist, but structure should be valid
    TestValidator.equals(
      "pagination structure valid",
      typeof customerIdFilterResult.pagination,
      "object",
    );
  }
  // Test 3: Search with date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          created_after: oneDayAgo.toISOString(),
          created_before: oneDayFromNow.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 4: Search with combined filters
  if (customerAccounts.length > 1) {
    const combinedFilterResult =
      await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
        adminConnection,
        {
          adminUserBanId: adminUserBan.id,
          body: {
            customer_id: customerAccounts[1].id,
            created_after: oneDayAgo.toISOString(),
            created_before: oneDayFromNow.toISOString(),
            page: 1,
            limit: 20,
          } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
  }
  // Test 5: Pagination behavior with limit
  const paginationResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "limit applied correctly",
    paginationResult.pagination.limit,
    2,
  );
  // Test 6: Edge case - search with non-existent adminUserBanId
  const nonExistentResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(nonExistentResult);
  // Should return empty result set rather than throwing 404
  TestValidator.equals(
    "returns pagination structure",
    typeof nonExistentResult.pagination,
    "object",
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(nonExistentResult.data),
    true,
  );
  // Validate that customer details are included in results when present
  if (allBansResult.data.length > 0) {
    const firstBan = allBansResult.data[0];
    TestValidator.equals(
      "has customer property",
      typeof firstBan.customer,
      "object",
    );
    TestValidator.predicate(
      "customer has required fields",
      () =>
        firstBan.customer.id !== undefined &&
        firstBan.customer.email !== undefined &&
        firstBan.customer.display_name !== undefined &&
        firstBan.customer.created_at !== undefined,
    );
  }
}
