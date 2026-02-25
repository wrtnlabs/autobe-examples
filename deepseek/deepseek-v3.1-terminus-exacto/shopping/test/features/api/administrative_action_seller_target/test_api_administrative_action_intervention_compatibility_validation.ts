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

export async function test_api_administrative_action_intervention_compatibility_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create administrative actions with different types
  const actionType1 = RandomGenerator.paragraph({ sentences: 1 });
  const action1Body = {
    action_type: actionType1,
    general_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMetadataRegistryRelationship.ICreate;
  const action1 =
    await api.functional.ecommerce.administrator.administrative_actions.create(
      adminConnection,
      { body: action1Body },
    );
  typia.assert(action1);
  const actionType2 = RandomGenerator.paragraph({ sentences: 1 });
  const action2Body = {
    action_type: actionType2,
    general_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMetadataRegistryRelationship.ICreate;
  const action2 =
    await api.functional.ecommerce.administrator.administrative_actions.create(
      adminConnection,
      { body: action2Body },
    );
  typia.assert(action2);
  // 3. Test successful creation with compatible intervention
  const compatibleIntervention = {
    intervention_type: "account_suspension",
    suspension_duration_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >(),
    effective_from: new Date(Date.now() + 3600000).toISOString(),
    effective_until: new Date(Date.now() + 86400000 * 30).toISOString(),
  } satisfies IEcommerceAdminUserBanOfSeller.ICreate;
  const successResult =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.create(
      adminConnection,
      {
        administrativeActionId: action1.id,
        body: compatibleIntervention,
      },
    );
  typia.assert(successResult);
  TestValidator.equals(
    "action matches",
    successResult.administrativeAction.id,
    action1.id,
  );
  TestValidator.equals(
    "intervention type matches",
    successResult.intervention_type,
    compatibleIntervention.intervention_type,
  );
  // 4. Test error when intervention_type is incompatible
  const incompatibleIntervention = {
    intervention_type: "selling_restriction",
    restriction_scope: "all_products",
    effective_from: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IEcommerceAdminUserBanOfSeller.ICreate;
  await TestValidator.httpError(
    "should reject incompatible intervention",
    400,
    async () => {
      await api.functional.ecommerce.administrator.administrative_actions.seller_targets.create(
        adminConnection,
        {
          administrativeActionId: action1.id,
          body: incompatibleIntervention,
        },
      );
    },
  );
  // 5. Test business rule: suspension_duration_days required for account_suspension
  const missingDurationIntervention = {
    intervention_type: "account_suspension",
    effective_from: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IEcommerceAdminUserBanOfSeller.ICreate;
  await TestValidator.httpError(
    "should require suspension_duration_days for suspension",
    400,
    async () => {
      await api.functional.ecommerce.administrator.administrative_actions.seller_targets.create(
        adminConnection,
        {
          administrativeActionId: action2.id,
          body: missingDurationIntervention,
        },
      );
    },
  );
  // 6. Test successful creation with restriction scope
  const restrictionIntervention = {
    intervention_type: "selling_restriction",
    restriction_scope: "specific_categories",
    effective_from: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IEcommerceAdminUserBanOfSeller.ICreate;
  const restrictionResult =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.create(
      adminConnection,
      {
        administrativeActionId: action1.id,
        body: restrictionIntervention,
      },
    );
  typia.assert(restrictionResult);
  TestValidator.equals(
    "restriction scope matches",
    restrictionResult.restriction_scope,
    restrictionIntervention.restriction_scope,
  );
}
