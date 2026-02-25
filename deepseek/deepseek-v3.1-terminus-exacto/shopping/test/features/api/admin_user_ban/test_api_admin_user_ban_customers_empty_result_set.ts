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
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

export async function test_api_admin_user_ban_customers_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator (using SDK since utility not imported)
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  // Step 2: Create administrative user ban record with no associated customer bans
  const adminUserBan =
    await api.functional.ecommerce.administrator.admin_user_bans.create(
      adminConnection,
      {
        body: {
          user_type: "customer",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          appeal_status: "none",
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number | null | undefined as number | null | undefined,
          appeal_reason: undefined,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // Step 3: Test with default pagination (should return empty result set)
  const emptyResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {} satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Step 4: Validate empty result set pagination metadata
  TestValidator.equals(
    "records should be 0 for empty result set",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for empty result set",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive default",
    emptyResult.pagination.limit > 0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResult.data.length,
    0,
  );
  // Step 5: Test filtering with invalid customer_id (non-existent UUID)
  const invalidCustomerIdResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(invalidCustomerIdResult);
  TestValidator.equals(
    "invalid customer_id filter should return empty records",
    invalidCustomerIdResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid customer_id filter should return empty pages",
    invalidCustomerIdResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "invalid customer_id filter should return empty data array",
    invalidCustomerIdResult.data.length,
    0,
  );
  // Step 6: Test date range filtering with future dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDateResult =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          created_after: tomorrow.toISOString(),
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(futureDateResult);
  TestValidator.equals(
    "future date filter should return empty records",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date filter should return empty pages",
    futureDateResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date filter should return empty data array",
    futureDateResult.data.length,
    0,
  );
  // Step 7: Validate all empty results maintain consistent pagination structure
  TestValidator.equals(
    "all empty results should have same limit",
    emptyResult.pagination.limit,
    invalidCustomerIdResult.pagination.limit,
  );
  TestValidator.equals(
    "all empty results should have same limit",
    emptyResult.pagination.limit,
    futureDateResult.pagination.limit,
  );
  TestValidator.equals(
    "all empty results should have current page 1",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all empty results should have current page 1",
    invalidCustomerIdResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all empty results should have current page 1",
    futureDateResult.pagination.current,
    1,
  );
}