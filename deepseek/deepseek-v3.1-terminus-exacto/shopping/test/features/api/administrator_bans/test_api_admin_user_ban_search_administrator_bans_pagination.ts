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

export async function test_api_admin_user_ban_search_administrator_bans_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create base administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create parent admin user ban record
  const adminUserBan =
    await api.functional.ecommerce.administrator.admin_user_bans.create(
      adminConnection,
      {
        body: {
          user_type: "administrator",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<30>
          >(),
          appeal_status: "none",
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // Create additional administrator accounts to be banned
  const bannedAdmins = await ArrayUtil.asyncRepeat(15, async () => {
    const adminConn: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    });
    return admin;
  });
  // Create multiple administrator ban relationships using actual administrator accounts
  const administratorBans = await ArrayUtil.asyncRepeat(15, async (index) => {
    const ban =
      await generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create(
        adminConnection,
        {
          params: { adminUserBanId: adminUserBan.id },
          body: {
            // Use actual administrator ID from the created accounts
            product_id: typia.assert<string & tags.Format<"uuid">>(bannedAdmins[index].id),
            action_details: `Test ban action ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            previous_state: null,
            new_state: null,
          } satisfies IEcommerceAdminUserBanOfAdministrator.ICreate,
        },
      );
    typia.assert(ban);
    return ban;
  });
  // Test pagination with default parameters
  const page1 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {} satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals(
    "total records matches created count",
    page1.pagination.records,
    administratorBans.length,
  );
  TestValidator.predicate("current page is 1", page1.pagination.current === 1);
  TestValidator.predicate(
    "has reasonable default limit",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1.pagination.pages ===
      Math.ceil(administratorBans.length / page1.pagination.limit),
  );
  // Test specific page with custom limit
  const customLimit = 5;
  const page2 =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: 2,
          limit: customLimit,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(page2);
  // Validate second page metadata
  TestValidator.equals("page 2 metadata correct", page2.pagination.current, 2);
  TestValidator.equals(
    "custom limit applied",
    page2.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data size matches limit when not on last page",
    page2.data.length <= customLimit && page2.data.length > 0,
  );
  // Test edge case: request page beyond total pages
  const lastPage = page1.pagination.pages + 1;
  const emptyPage =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: lastPage,
          limit: customLimit,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(emptyPage);
  // Validate empty page returns empty array but maintains metadata
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty page shows correct current page",
    emptyPage.pagination.current,
    lastPage,
  );
  TestValidator.equals(
    "total records maintained on empty page",
    emptyPage.pagination.records,
    administratorBans.length,
  );
  // Test small page size
  const tinyPage =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.index(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceAdminUserBanOfAdministrator.IRequest,
      },
    );
  typia.assert(tinyPage);
  TestValidator.equals(
    "tiny page returns exactly one item",
    tinyPage.data.length,
    1,
  );
  TestValidator.predicate(
    "tiny page calculates correct total pages",
    tinyPage.pagination.pages === administratorBans.length,
  );
}