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
import { generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create";
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_admin_user_ban_of_administrator } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_administrator";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

export async function test_api_admin_user_ban_search_administrator_bans_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create parent admin user ban record
  const adminUserBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "administrator",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          appeal_status: "none",
          appeal_reason: null,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // Create multiple administrator ban associations
  const productIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const administratorBans = await ArrayUtil.asyncRepeat(3, async (index) => {
    const ban =
      await generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create(
        adminConnection,
        {
          body: {
            product_id: productIds[index],
            action_details: `Administrator ban action ${index + 1}`,
            previous_state: "active",
            new_state: "banned",
          } satisfies IEcommerceAdminUserBanOfAdministrator.ICreate,
          params: {
            adminUserBanId: adminUserBan.id,
          },
        },
      );
    typia.assert(ban);
    return ban;
  });
  // Test search with text filter
  const searchResult1 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          search: "Administrator ban action",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "search should return matching results",
    searchResult1.data.length,
    3,
  );
  TestValidator.equals(
    "pagination should be correct",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be correct",
    searchResult1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 3",
    searchResult1.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages should be 1",
    searchResult1.pagination.pages,
    1,
  );
  // Test search with specific product ID filter
  const searchResult2 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          product_id: productIds[0],
          page: 1,
          limit: 5,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "product filter should return one match",
    searchResult2.data.length,
    1,
  );
  TestValidator.equals(
    "product ID should match",
    searchResult2.data[0].id,
    administratorBans[0].id,
  );
  // Test search with pagination
  const searchResult3 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals("paginated results count", searchResult3.data.length, 2);
  TestValidator.equals("current page", searchResult3.pagination.current, 1);
  TestValidator.equals("page limit", searchResult3.pagination.limit, 2);
  TestValidator.equals("total records", searchResult3.pagination.records, 3);
  TestValidator.equals("total pages", searchResult3.pagination.pages, 2);
  // Test empty search (all records)
  const searchResult4 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty search should return all results",
    searchResult4.data.length,
    3,
  );
  // Validate response structure
  searchResult4.data.forEach((item, index) => {
    TestValidator.predicate("item should have id", item.id !== undefined);
    TestValidator.predicate(
      "item should have action details",
      item.actionDetails !== undefined,
    );
    TestValidator.predicate(
      "item should have product",
      item.product !== undefined,
    );
    TestValidator.predicate(
      "item should have administrative action",
      item.administrativeAction !== undefined,
    );
    TestValidator.equals(
      "product should have expected structure",
      typeof item.product.name,
      "string",
    );
    TestValidator.equals(
      "administrative action should have expected structure",
      typeof item.administrativeAction.action_type,
      "string",
    );
  });
}
