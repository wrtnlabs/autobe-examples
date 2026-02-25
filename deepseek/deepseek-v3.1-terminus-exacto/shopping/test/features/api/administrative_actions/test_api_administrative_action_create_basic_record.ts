import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
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

export async function test_api_administrative_action_create_basic_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create administrative action
  const actionBody = {
    action_type: "system_maintenance",
    general_description: "Weekly system maintenance and security updates",
  } satisfies IEcommerceMetadataRegistryRelationship.ICreate;
  const action =
    await api.functional.ecommerce.administrator.administrative_actions.create(
      adminConnection,
      { body: actionBody },
    );
  typia.assert(action);
  // 3. Validate response structure and content
  TestValidator.equals(
    "action type matches input",
    action.action_type,
    actionBody.action_type,
  );
  TestValidator.equals(
    "description matches input",
    action.general_description,
    actionBody.general_description,
  );
  TestValidator.predicate(
    "has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      action.id,
    ),
  );
  TestValidator.predicate(
    "has creation timestamp",
    action.created_at !== null && new Date(action.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "has update timestamp",
    action.updated_at !== null && new Date(action.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "has administrator attribution",
    action.administrator !== null,
  );
  TestValidator.equals(
    "administrator ID matches",
    action.administrator?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "administrator email matches",
    action.administrator?.email,
    adminAuth.email,
  );
  TestValidator.predicate(
    "super administrator is null",
    action.super_administrator === null,
  );
}
