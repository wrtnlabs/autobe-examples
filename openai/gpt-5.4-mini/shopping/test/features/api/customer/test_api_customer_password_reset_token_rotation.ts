import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_password_resets_create } from "../../../generate/generate_random_mall_platform_customer_password_resets_create";
import { prepare_random_mall_platform_administrator_password_reset } from "../../../prepare/prepare_random_mall_platform_administrator_password_reset";

export async function test_api_customer_password_reset_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstReset =
    await generate_random_mall_platform_customer_password_resets_create(
      customerConnection,
      {
        body: {
          administratorId: authorized.id,
        } satisfies IMallPlatformAdministratorPasswordReset.ICreate,
      },
    );
  typia.assert(firstReset);
  const secondReset =
    await generate_random_mall_platform_customer_password_resets_create(
      customerConnection,
      {
        body: {
          administratorId: authorized.id,
        } satisfies IMallPlatformAdministratorPasswordReset.ICreate,
      },
    );
  typia.assert(secondReset);
  TestValidator.equals(
    "customer id remains stable",
    authorized.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email remains stable",
    authorized.email,
    authorized.email,
  );
  TestValidator.equals(
    "first reset owner id",
    firstReset.administrator.id,
    authorized.id,
  );
  TestValidator.equals(
    "second reset owner id",
    secondReset.administrator.id,
    authorized.id,
  );
  TestValidator.notEquals(
    "reset record ids should differ",
    firstReset.id,
    secondReset.id,
  );
  TestValidator.notEquals(
    "reset tokens should differ",
    firstReset.token,
    secondReset.token,
  );
  TestValidator.predicate(
    "second reset should be created at or after the first reset",
    new Date(secondReset.createdAt).getTime() >=
      new Date(firstReset.createdAt).getTime(),
  );
  TestValidator.predicate(
    "second reset should be updated at or after the first reset",
    new Date(secondReset.updatedAt).getTime() >=
      new Date(firstReset.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "first reset should have a valid expiration timestamp",
    new Date(firstReset.expiredAt).getTime() >=
      new Date(firstReset.createdAt).getTime(),
  );
  TestValidator.predicate(
    "second reset should have a valid expiration timestamp",
    new Date(secondReset.expiredAt).getTime() >=
      new Date(secondReset.createdAt).getTime(),
  );
}
