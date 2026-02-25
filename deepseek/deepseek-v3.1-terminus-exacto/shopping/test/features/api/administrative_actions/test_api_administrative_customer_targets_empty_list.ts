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
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_administrative_customer_targets_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create administrative action without customer targets
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.paragraph({ sentences: 1 }),
          general_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // 3. Retrieve customer targets for the administrative action (should be empty)
  const customerTargetsResponse =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.index(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceAdminUserBanOfCustomer.IRequest,
      },
    );
  typia.assert(customerTargetsResponse);
  // 4. Validate empty response structure
  TestValidator.equals(
    "current page should be 1",
    customerTargetsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20",
    customerTargetsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records should be 0 for empty list",
    customerTargetsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0 for zero records",
    customerTargetsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should contain 0 items",
    customerTargetsResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "data array should be empty",
    customerTargetsResponse.data.length === 0,
  );
}
