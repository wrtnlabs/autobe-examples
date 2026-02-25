import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_seller_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_seller_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * Test that an administrator can search and filter seller targets associated with an administrative action.
 */
export async function test_api_administrative_action_seller_targets_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create an administrative action using utility function
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "seller_intervention",
          general_description:
            "Test administrative action for seller targets search",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // 3. Create multiple seller targets with different intervention types
  const sellerTargets = await ArrayUtil.asyncRepeat(3, async (index) => {
    const interventionTypes = [
      "account_suspension",
      "selling_restriction",
      "warning_issued",
    ] as const;
    const sellerTarget =
      await api.functional.ecommerce.administrator.administrative_actions.seller_targets.create(
        adminConnection,
        {
          administrativeActionId: administrativeAction.id,
          body: {
            intervention_type: interventionTypes[index],
            suspension_duration_days:
              interventionTypes[index] === "account_suspension" ? 30 : null,
            restriction_scope:
              interventionTypes[index] === "selling_restriction"
                ? "all_products"
                : null,
            effective_from: new Date().toISOString(),
          } satisfies IEcommerceAdminUserBanOfSeller.ICreate,
        },
      );
    typia.assert(sellerTarget);
    return sellerTarget;
  });
  // 4. Test search without filters (get all targets)
  const allTargets =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(allTargets);
  // Validate pagination metadata
  TestValidator.equals("total records", allTargets.pagination.records, 3);
  TestValidator.equals("current page", allTargets.pagination.current, 1);
  TestValidator.equals("page limit", allTargets.pagination.limit, 10);
  TestValidator.equals("total pages", allTargets.pagination.pages, 1);
  TestValidator.equals("data count", allTargets.data.length, 3);
  // 5. Test filtering by intervention type
  const suspensionTargets =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          intervention_type: "account_suspension",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(suspensionTargets);
  TestValidator.equals(
    "suspension targets count",
    suspensionTargets.data.length,
    1,
  );
  TestValidator.equals(
    "correct intervention type",
    suspensionTargets.data[0].intervention_type,
    "account_suspension",
  );
  // 6. Test filtering by suspension duration
  const durationTargets =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          suspension_duration_days: 30,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(durationTargets);
  TestValidator.equals(
    "duration targets count",
    durationTargets.data.length,
    1,
  );
  TestValidator.equals(
    "correct suspension duration",
    durationTargets.data[0].suspension_duration_days,
    30,
  );
  // 7. Test filtering by restriction scope
  const restrictionTargets =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          restriction_scope: "all_products",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(restrictionTargets);
  TestValidator.equals(
    "restriction targets count",
    restrictionTargets.data.length,
    1,
  );
  TestValidator.equals(
    "correct restriction scope",
    restrictionTargets.data[0].restriction_scope,
    "all_products",
  );
  // 8. Test filtering by date range
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const pastTargets =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          effective_from: pastDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(pastTargets);
  // Should return targets with effective dates after the past date
  TestValidator.predicate(
    "past targets should include current targets",
    pastTargets.data.length > 0,
  );
  // 9. Test pagination with smaller limit
  const paginatedTargets =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(paginatedTargets);
  TestValidator.equals("paginated data count", paginatedTargets.data.length, 2);
  TestValidator.equals(
    "paginated total pages",
    paginatedTargets.pagination.pages,
    2,
  );
  TestValidator.equals(
    "paginated total records",
    paginatedTargets.pagination.records,
    3,
  );
}
