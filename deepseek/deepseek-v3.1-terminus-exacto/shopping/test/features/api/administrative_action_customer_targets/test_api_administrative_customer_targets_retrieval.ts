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
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_customer_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_customer_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_administrative_customer_targets_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create administrative action
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.paragraph({ sentences: 1 }),
          general_description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(administrativeAction);
  // 3. Create multiple customer targets
  const createdTargets: IEcommerceAdminUserBanOfCustomer[] = [];
  for (let i = 0; i < 3; i++) {
    const target =
      await generate_random_ecommerce_administrator_administrative_actions_customer_targets_create(
        adminConnection,
        {
          params: {
            administrativeActionId: administrativeAction.id,
          },
          body: {
            ecommerce_administrative_action_id:
              administrativeAction.id satisfies string & tags.Format<"uuid">,
            ecommerce_customer_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    typia.assert(target);
    createdTargets.push(target);
  }
  // 4. Retrieve paginated customer targets
  const retrievedPage =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(retrievedPage);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    retrievedPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", retrievedPage.pagination.limit, 20);
  TestValidator.predicate(
    "total records at least created count",
    retrievedPage.pagination.records >= createdTargets.length,
  );
  TestValidator.predicate(
    "positive total pages",
    retrievedPage.pagination.pages > 0,
  );
  // 6. Validate business logic - customer summaries contain valid data
  for (const summary of retrievedPage.data) {
    typia.assert(summary.customer);
    // Business logic validations instead of type checks
    TestValidator.predicate(
      "customer email is not empty",
      summary.customer.email.length > 0,
    );
    TestValidator.predicate(
      "customer display name is not empty",
      summary.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer created at timestamp is valid",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(summary.customer.created_at),
    );
  }
  // 7. Verify created targets appear in retrieved results and administrative action filtering
  const retrievedIds = new Set(retrievedPage.data.map((d) => d.id));
  for (const createdTarget of createdTargets) {
    TestValidator.predicate(
      `created target ${createdTarget.id} appears in retrieved results`,
      retrievedIds.has(createdTarget.id),
    );
  }
  // 8. Additional validation: data count matches or exceeds created targets
  TestValidator.predicate(
    "retrieved data count at least created targets count",
    retrievedPage.data.length >= createdTargets.length,
  );
}
