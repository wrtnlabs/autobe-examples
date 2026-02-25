import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_administrative_action_order_intervention_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create parent administrative action record
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "order_intervention",
          general_description:
            "Administrative intervention on order processing",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // Retrieve order-specific administrative action details
  const orderAction =
    await api.functional.ecommerce.administrator.administrative_actions.order_action.at(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
      },
    );
  typia.assert(orderAction);
  // Validate response structure and content
  TestValidator.equals(
    "administrative action ID matches",
    orderAction.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.predicate(
    "has valid intervention type",
    orderAction.intervention_type.length > 0,
  );
  TestValidator.predicate(
    "has valid effective from timestamp",
    new Date(orderAction.effective_from) <= new Date(),
  );
  if (orderAction.effective_until !== null) {
    TestValidator.predicate(
      "effective until is after effective from",
      new Date(orderAction.effective_until) >
        new Date(orderAction.effective_from),
    );
  }
  if (orderAction.suspension_duration_days !== null) {
    TestValidator.predicate(
      "suspension duration is positive",
      orderAction.suspension_duration_days > 0,
    );
  }
  // Validate related entities
  TestValidator.predicate(
    "has valid seller",
    orderAction.seller.id.length > 0 && orderAction.seller.email.length > 0,
  );
  TestValidator.predicate(
    "has valid administrative action",
    orderAction.administrativeAction.id.length > 0,
  );
  TestValidator.equals(
    "action type matches",
    orderAction.administrativeAction.action_type,
    administrativeAction.action_type,
  );
}
