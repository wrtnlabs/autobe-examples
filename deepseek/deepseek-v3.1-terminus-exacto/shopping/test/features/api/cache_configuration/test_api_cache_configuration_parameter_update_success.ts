import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_cache_configuration_parameter_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Generate test data - assuming cache configuration and parameter exist
  const configId = typia.random<string & tags.Format<"uuid">>();
  const parameterId = typia.random<string & tags.Format<"uuid">>();
  const newParameterValue = RandomGenerator.alphabets(10);
  // 3. Update cache configuration parameter
  const updatedParameter =
    await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.update(
      superAdminConnection,
      {
        configId,
        parameterId,
        body: {
          parameterValue: newParameterValue,
        } satisfies IEcommerceCacheConfigurationParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // 4. Validate response
  TestValidator.equals(
    "parameter id matches",
    updatedParameter.id,
    parameterId,
  );
  TestValidator.equals(
    "parameter value updated",
    updatedParameter.parameter_value,
    newParameterValue,
  );
  TestValidator.predicate(
    "parameter name exists",
    () => updatedParameter.parameter_name.length > 0,
  );
  TestValidator.predicate(
    "data type exists",
    () => updatedParameter.data_type.length > 0,
  );
  TestValidator.predicate(
    "description exists",
    () => updatedParameter.description.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp valid",
    () => new Date(updatedParameter.created_at).getTime() > 0,
  );
}
