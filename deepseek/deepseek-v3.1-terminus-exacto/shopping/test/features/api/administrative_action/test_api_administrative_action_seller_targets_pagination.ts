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

export async function test_api_administrative_action_seller_targets_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create administrative action
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "seller_intervention",
          general_description: "Seller targets pagination test",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // Create multiple seller targets with varied intervention types
  const interventionTypes = [
    "account_suspension",
    "selling_restriction",
    "product_removal",
    "warning_issued",
  ] as const;
  const sellerTargets: IEcommerceAdminUserBanOfSeller[] = [];
  for (let i = 0; i < 23; i++) {
    const interventionType = RandomGenerator.pick(interventionTypes);
    const sellerTarget =
      await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
        adminConnection,
        {
          params: { administrativeActionId: administrativeAction.id },
          body: {
            intervention_type: interventionType,
            suspension_duration_days:
              interventionType === "account_suspension"
                ? typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<1> &
                      tags.Maximum<30>
                  >()
                : null,
            restriction_scope:
              interventionType === "selling_restriction"
                ? "all_products"
                : null,
            effective_from: new Date(Date.now() + i * 86400000).toISOString(), // Different dates
            effective_until:
              interventionType === "account_suspension"
                ? new Date(Date.now() + (i + 30) * 86400000).toISOString()
                : null,
          } satisfies IEcommerceAdminUserBanOfSeller.ICreate,
        },
      );
    typia.assert(sellerTarget);
    sellerTargets.push(sellerTarget);
  }
  // Test pagination with different page sizes
  const pageSizes = [1, 5, 10, 20, 100] as const;
  let totalRecords = 0;
  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage =
      await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
        adminConnection,
        {
          administrativeActionId: administrativeAction.id,
          body: {
            page: 1,
            limit: pageSize,
          } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals(
      `first page limit ${pageSize}`,
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      `first page current ${pageSize}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.predicate(
      `first page records within limit ${pageSize}`,
      firstPage.pagination.records >= sellerTargets.length,
    );
    totalRecords = firstPage.pagination.records;
    const expectedTotalPages = Math.ceil(totalRecords / pageSize);
    TestValidator.equals(
      `first page total pages ${pageSize}`,
      firstPage.pagination.pages,
      expectedTotalPages,
    );
    TestValidator.predicate(
      `first page data length ${pageSize}`,
      firstPage.data.length <= pageSize,
    );
    // Test middle page if exists
    if (expectedTotalPages > 2) {
      const middlePage = Math.floor(expectedTotalPages / 2);
      const middlePageResult =
        await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
          adminConnection,
          {
            administrativeActionId: administrativeAction.id,
            body: {
              page: middlePage,
              limit: pageSize,
            } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
          },
        );
      typia.assert(middlePageResult);
      TestValidator.equals(
        `middle page current ${pageSize}`,
        middlePageResult.pagination.current,
        middlePage,
      );
      TestValidator.equals(
        `middle page limit ${pageSize}`,
        middlePageResult.pagination.limit,
        pageSize,
      );
      TestValidator.predicate(
        `middle page data length ${pageSize}`,
        middlePageResult.data.length <= pageSize,
      );
    }
    // Test last page
    const lastPage =
      await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
        adminConnection,
        {
          administrativeActionId: administrativeAction.id,
          body: {
            page: expectedTotalPages,
            limit: pageSize,
          } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      `last page current ${pageSize}`,
      lastPage.pagination.current,
      expectedTotalPages,
    );
    TestValidator.predicate(
      `last page data length ${pageSize}`,
      lastPage.data.length <= pageSize,
    );
    // Test page beyond total count
    const beyondPage =
      await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
        adminConnection,
        {
          administrativeActionId: administrativeAction.id,
          body: {
            page: expectedTotalPages + 1,
            limit: pageSize,
          } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.equals(
      `beyond page current ${pageSize}`,
      beyondPage.pagination.current,
      expectedTotalPages + 1,
    );
    TestValidator.predicate(
      `beyond page empty ${pageSize}`,
      beyondPage.data.length === 0,
    );
  }
  // Test empty result set with specific filter
  const emptyResult =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          intervention_type: "non_existent_intervention",
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.predicate(
    "empty result data array",
    emptyResult.data.length === 0,
  );
  // Test minimum/maximum page size limits
  const minimumPage =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(minimumPage);
  TestValidator.equals(
    "minimum page size limit",
    minimumPage.pagination.limit,
    1,
  );
  const maximumPage =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminUserBanOfSeller.IRequest,
      },
    );
  typia.assert(maximumPage);
  TestValidator.equals(
    "maximum page size limit",
    maximumPage.pagination.limit,
    100,
  );
}
