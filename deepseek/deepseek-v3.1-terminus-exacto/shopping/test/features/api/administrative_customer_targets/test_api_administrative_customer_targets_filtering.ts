import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_customer_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_customer_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_administrative_customer_targets_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // Step 2: Create administrative action
  const adminAction =
    await api.functional.ecommerce.administrator.administrative_actions.create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.alphabets(10),
          general_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(adminAction);
  // Step 3: Create multiple customers and customer targets
  const targetRecords: IEcommerceAdminUserBanOfCustomer[] = [];
  const customerIds: string[] = [];
  // Create 5 customers with different creation times
  for (let i = 0; i < 5; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      },
    });
    typia.assert(customerAuth);
    customerIds.push(customerAuth.id);
    // Create customer target with artificial delay for different creation dates
    await new Promise((resolve) => setTimeout(resolve, 10));
    const target =
      await api.functional.ecommerce.administrator.administrative_actions.customer_targets.create(
        adminConnection,
        {
          administrativeActionId: adminAction.id,
          body: {
            ecommerce_administrative_action_id: adminAction.id,
            ecommerce_customer_id: customerAuth.id,
          } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
        },
      );
    typia.assert(target);
    targetRecords.push(target);
  }
  // Step 4: Test filtering by specific customer ID
  const firstCustomerId = customerIds[0];
  const filterByCustomer =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: adminAction.id,
        body: {
          customer_id: firstCustomerId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(filterByCustomer);
  TestValidator.equals(
    "filter by customer ID should return only that customer's records",
    filterByCustomer.data.length,
    1,
  );
  TestValidator.equals(
    "filtered record should match the requested customer ID",
    filterByCustomer.data[0].customer.id,
    firstCustomerId,
  );
  // Step 5: Test filtering by creation date range
  const midDate = targetRecords[2].created_at;
  const dateFilter =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: adminAction.id,
        body: {
          created_after: targetRecords[0].created_at,
          created_before: targetRecords[4].created_at,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(dateFilter);
  TestValidator.predicate(
    "date filter should return records within range",
    dateFilter.data.length >= 3 && dateFilter.data.length <= 5,
  );
  // Step 6: Test pagination - page 1 with limit 2
  const page1 =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: adminAction.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 should have requested limit",
    page1.data.length,
    2,
  );
  // Step 7: Test pagination - page 2 with limit 2
  const page2 =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: adminAction.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 should have requested limit",
    page2.data.length,
    2,
  );
  // Step 8: Test no results filter
  const noResultsFilter =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: adminAction.id,
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(noResultsFilter);
  TestValidator.equals(
    "should return empty results for non-existent customer ID",
    noResultsFilter.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records for empty results",
    noResultsFilter.pagination.records,
    0,
  );
  // Step 9: Test combined filter with pagination
  const combinedFilter =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: adminAction.id,
        body: {
          customer_id: firstCustomerId,
          created_before: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter should work correctly",
    combinedFilter.data.length === 1 || combinedFilter.data.length === 0,
  );
}
