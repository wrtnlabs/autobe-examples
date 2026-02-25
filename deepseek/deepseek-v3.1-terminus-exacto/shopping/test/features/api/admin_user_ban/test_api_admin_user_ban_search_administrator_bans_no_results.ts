import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfAdministrator";
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

export async function test_api_admin_user_ban_search_administrator_bans_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create a parent admin user ban record
  const banRecord =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "administrator",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          appeal_status: "none",
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(banRecord);
  // Test 1: Search with non-existent administrator ID
  const search1 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: banRecord.id,
        body: {
          search: "nonexistent-administrator-search-term",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(search1);
  // Validate no results for search with non-existent search term
  TestValidator.equals("search1 data should be empty", search1.data, []);
  TestValidator.equals(
    "search1 records should be 0",
    search1.pagination.records,
    0,
  );
  TestValidator.equals(
    "search1 pages should be 0",
    search1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "search1 current page should be 1",
    search1.pagination.current,
    1,
  );
  TestValidator.equals(
    "search1 limit should be 10",
    search1.pagination.limit,
    10,
  );
  // Test 2: Search with empty search term
  const search2 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: banRecord.id,
        body: {
          search: "",
          page: 1,
          limit: 5,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(search2);
  // Validate no results for empty search
  TestValidator.equals("search2 data should be empty", search2.data, []);
  TestValidator.equals(
    "search2 records should be 0",
    search2.pagination.records,
    0,
  );
  TestValidator.equals(
    "search2 pages should be 0",
    search2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "search2 current page should be 1",
    search2.pagination.current,
    1,
  );
  TestValidator.equals(
    "search2 limit should be 5",
    search2.pagination.limit,
    5,
  );
}
