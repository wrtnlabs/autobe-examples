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

export async function test_api_system_version_create_duplicate_version_conflict(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare random system version create input
  const baseInput = await (async () => {
    const entityId = typia.random<string & tags.Format<"uuid">>();
    const entityName = `entity_${RandomGenerator.alphabets(4)}`;
    const versionNumber = typia.random<number & tags.Type<"int32">>();
    const now = new Date().toISOString();
    const changedFields = JSON.stringify(["field1", "field2"]);
    return {
      entity_name: entityName,
      entity_id: entityId,
      version_number: versionNumber,
      changed_fields: changedFields,
      change_description: "Initial version creation",
      changed_by: adminAuth.email,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies IShoppingMallSystemVersion.ICreate;
  })();
  // 3. Create first system version - should succeed
  const firstVersion =
    await generate_random_shopping_mall_administrator_system_versions_create(
      adminConnection,
      {
        body: baseInput,
      },
    );
  typia.assert(firstVersion);
  // 4. Create second system version with same entity_name, entity_id, version_number - should fail
  await TestValidator.error(
    "duplicate version conflict on system version creation",
    async () => {
      await generate_random_shopping_mall_administrator_system_versions_create(
        adminConnection,
        {
          body: baseInput,
        },
      );
    },
  );
}
