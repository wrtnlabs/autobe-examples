import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_system_versions_create } from "../../../generate/generate_random_shopping_mall_administrator_system_versions_create";
import { prepare_random_shopping_mall_system_version } from "../../../prepare/prepare_random_shopping_mall_system_version";

export async function test_api_system_version_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join to get authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // Prepare a new system version creation body
  const now = new Date().toISOString();
  const body: IShoppingMallSystemVersion.ICreate = {
    entity_name: "shopping_mall_test_entity",
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    version_number: typia.random<number & tags.Type<"int32">>(),
    changed_fields: JSON.stringify(["fieldA", "fieldB"]),
    created_at: now,
    updated_at: now,
  };
  // Create a new system version record
  const output =
    await generate_random_shopping_mall_administrator_system_versions_create(
      adminConnection,
      { body },
    );
  typia.assert(output);
  // Validate response fields
  TestValidator.equals(
    "created entity_name matches",
    output.entityName,
    body.entity_name,
  );
  TestValidator.equals(
    "created entity_id matches",
    output.entityId,
    body.entity_id,
  );
  TestValidator.equals(
    "created version_number matches",
    output.versionNumber,
    body.version_number,
  );
  TestValidator.equals(
    "created changed_fields matches",
    output.changedFields,
    body.changed_fields,
  );
  TestValidator.equals(
    "created createdAt matches",
    output.createdAt,
    body.created_at,
  );
  TestValidator.equals(
    "created updatedAt matches",
    output.updatedAt,
    body.updated_at,
  );
  TestValidator.predicate(
    "output id is uuid",
    /^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/.test(
      output.id,
    ),
  );
  // deletedAt should be null or undefined
  TestValidator.predicate(
    "deletedAt is null or undefined",
    output.deletedAt === null || output.deletedAt === undefined,
  );
}
