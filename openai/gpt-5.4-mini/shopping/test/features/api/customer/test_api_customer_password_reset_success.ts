import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const resetConnection: api.IConnection = { host: connection.host };
  const resetToken = RandomGenerator.alphaNumeric(32);
  const newPassword = RandomGenerator.alphaNumeric(18);
  const resetResponse =
    await api.functional.mallPlatform.customer.password_resets.index(
      resetConnection,
      {
        body: {
          token: resetToken,
          password: newPassword,
        } satisfies IMallPlatformAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);
  await TestValidator.error("reset token should not be reusable", async () => {
    const retryConnection: api.IConnection = { host: connection.host };
    await api.functional.mallPlatform.customer.password_resets.index(
      retryConnection,
      {
        body: {
          token: resetToken,
          password: RandomGenerator.alphaNumeric(20),
        } satisfies IMallPlatformAdministratorPasswordReset.IRequest,
      },
    );
  });
}
