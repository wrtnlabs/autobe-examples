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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_customer_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_customer_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_administrative_action_customer_target_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create customer account using authorize_customer_join utility
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  // 3. Create administrative action
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.paragraph({ sentences: 1 }).substring(
            0,
            50,
          ),
          general_description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(administrativeAction);
  // 4. Create customer target association
  const customerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_customer_targets_create(
      adminConnection,
      {
        params: {
          administrativeActionId: administrativeAction.id,
        },
        body: {
          ecommerce_administrative_action_id: administrativeAction.id,
          ecommerce_customer_id: customer.id,
        },
      },
    );
  typia.assert(customerTarget);
  // 5. Retrieve the specific customer target record
  const retrievedCustomerTarget =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        customerTargetId: customerTarget.id,
      },
    );
  typia.assert(retrievedCustomerTarget);
  // 6. Validate the retrieved record
  TestValidator.equals(
    "customer target ID",
    retrievedCustomerTarget.id,
    customerTarget.id,
  );
  TestValidator.equals(
    "administrative action ID match",
    retrievedCustomerTarget.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.equals(
    "customer ID match",
    retrievedCustomerTarget.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    () =>
      new Date(retrievedCustomerTarget.created_at) instanceof Date &&
      !isNaN(new Date(retrievedCustomerTarget.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    () =>
      new Date(retrievedCustomerTarget.updated_at) instanceof Date &&
      !isNaN(new Date(retrievedCustomerTarget.updated_at).getTime()),
  );
  TestValidator.predicate(
    "administrative action summary present",
    () =>
      retrievedCustomerTarget.administrativeAction !== null &&
      typeof retrievedCustomerTarget.administrativeAction === "object",
  );
  TestValidator.predicate(
    "customer summary present",
    () =>
      retrievedCustomerTarget.customer !== null &&
      typeof retrievedCustomerTarget.customer === "object",
  );
}
