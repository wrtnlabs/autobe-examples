import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_administrative_action_customer_target_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(authorizedAdmin);
  // 2. Create a valid administrative action for reference
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "customer_ban",
          general_description:
            "Test administrative action for customer target retrieval",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // 3. Test valid administrative action ID with non-existent customer target ID
  await TestValidator.httpError(
    "404 error for valid admin action ID with non-existent customer target ID",
    404,
    async () => {
      await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
        adminConnection,
        {
          administrativeActionId: administrativeAction.id,
          customerTargetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Test invalid administrative action ID with invalid customer target ID
  await TestValidator.httpError(
    "404 error for invalid admin action ID with invalid customer target ID",
    404,
    async () => {
      await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
        adminConnection,
        {
          administrativeActionId: typia.random<string & tags.Format<"uuid">>(),
          customerTargetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Test invalid administrative action ID with valid customer target ID format
  await TestValidator.httpError(
    "404 error for invalid admin action ID with valid customer target ID",
    404,
    async () => {
      await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
        adminConnection,
        {
          administrativeActionId: typia.random<string & tags.Format<"uuid">>(),
          customerTargetId: administrativeAction.id,
        },
      );
    },
  );
}
