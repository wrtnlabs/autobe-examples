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

export async function test_api_administrative_customer_target_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create administrative action using generation function
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.paragraph({ sentences: 1 }),
          general_description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(administrativeAction);
  // 3. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 4. Create customer targeting relationship
  const target =
    await generate_random_ecommerce_administrator_administrative_actions_customer_targets_create(
      adminConnection,
      {
        params: { administrativeActionId: administrativeAction.id },
        body: {
          ecommerce_administrative_action_id: administrativeAction.id,
          ecommerce_customer_id: customer.id,
        },
      },
    );
  typia.assert(target);
  // 5. Validate response
  TestValidator.equals("target ID exists", typeof target.id, "string");
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(new Date(target.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(new Date(target.updated_at).getTime()),
  );
  TestValidator.equals("deleted_at is null", target.deleted_at, null);
  // Validate relationship summaries
  TestValidator.equals(
    "administrative action ID matches",
    target.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.equals("customer ID matches", target.customer.id, customer.id);
  TestValidator.equals(
    "customer email matches",
    target.customer.email,
    customer.email,
  );
}
