import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_retrieval_malformed_json(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Use a random configuration key that likely doesn't exist
  const nonExistentKey = `non_existent_${RandomGenerator.alphaNumeric(16)}`;
  // Test retrieval of non-existent configuration - should fail
  await TestValidator.error("configuration not found", async () => {
    await api.functional.ecommerceMall.admin.system_configurations.at(
      adminConnection,
      {
        configurationKey: nonExistentKey,
      },
    );
  });
  // Test with malformed-looking key format (special characters)
  const malformedKey = "test-malformed-key";
  await TestValidator.error("malformed key rejected", async () => {
    await api.functional.ecommerceMall.admin.system_configurations.at(
      adminConnection,
      {
        configurationKey: malformedKey,
      },
    );
  });
}
