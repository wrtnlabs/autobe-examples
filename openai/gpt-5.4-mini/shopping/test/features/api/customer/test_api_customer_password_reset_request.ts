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

export async function test_api_customer_password_reset_request(
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
  const reset: IMallPlatformAdministratorPasswordReset =
    await generate_random_mall_platform_customer_password_resets_create(
      customerConnection,
      {
        body: {
          administratorId: authorized.id,
        } satisfies IMallPlatformAdministratorPasswordReset.ICreate,
      },
    );
  typia.assert(reset);
  TestValidator.equals(
    "reset record belongs to the authenticated account context",
    reset.administrator.id,
    authorized.id,
  );
  TestValidator.predicate("reset token is generated", reset.token.length > 0);
  TestValidator.predicate(
    "reset expiration is not earlier than creation",
    new Date(reset.expiredAt).getTime() >= new Date(reset.createdAt).getTime(),
  );
  TestValidator.predicate(
    "reset has audit timestamps",
    reset.createdAt.length > 0 && reset.updatedAt.length > 0,
  );
  TestValidator.equals("reset is active", reset.deletedAt, null);
}
