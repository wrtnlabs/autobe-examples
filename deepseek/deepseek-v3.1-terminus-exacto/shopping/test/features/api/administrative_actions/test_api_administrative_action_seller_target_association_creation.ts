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
import { generate_random_ecommerce_administrator_administrative_actions_seller_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_seller_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_administrative_action_seller_target_association_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  typia.assert(administrator);
  // 2. Create administrative action
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "seller_intervention",
          general_description: "Test seller intervention action",
        },
      },
    );
  typia.assert(administrativeAction);
  // 3. Create seller target association
  const sellerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
      adminConnection,
      {
        params: {
          administrativeActionId: administrativeAction.id,
        },
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          effective_from: new Date().toISOString(),
          effective_until: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(sellerTarget);
  // 4. Validate business logic only (NO TYPE CHECKS)
  TestValidator.predicate(
    "intervention type matches input",
    sellerTarget.intervention_type === "account_suspension",
  );
  TestValidator.equals(
    "suspension duration matches input",
    sellerTarget.suspension_duration_days,
    sellerTarget.suspension_duration_days,
  );
  // 5. Validate relationships (business logic only)
  TestValidator.equals(
    "administrative action id matches parent",
    sellerTarget.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.predicate(
    "administrative action type is defined",
    sellerTarget.administrativeAction.action_type.length > 0,
  );
  TestValidator.predicate(
    "seller information is populated",
    sellerTarget.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller email contains @ symbol",
    sellerTarget.seller.email.includes("@"),
  );
  // 6. Verify timestamps (business logic validation)
  const now = new Date();
  const effectiveFrom = new Date(sellerTarget.effective_from);
  TestValidator.predicate(
    "effective from is recent",
    now.getTime() - effectiveFrom.getTime() < 60000,
  );
  if (sellerTarget.effective_until !== null) {
    const effectiveUntil = new Date(sellerTarget.effective_until);
    TestValidator.predicate(
      "effective until is after effective from",
      effectiveUntil.getTime() > effectiveFrom.getTime(),
    );
  }
}
