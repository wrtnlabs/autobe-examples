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
import { generate_random_mall_platform_customer_password_resets_create } from "../../../generate/generate_random_mall_platform_customer_password_resets_create";
import { prepare_random_mall_platform_administrator_password_reset } from "../../../prepare/prepare_random_mall_platform_administrator_password_reset";

export async function test_api_customer_password_reset_reused_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(16);
  const newPassword = RandomGenerator.alphaNumeric(18);
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password: initialPassword,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const resetConnection: api.IConnection = { host: connection.host };
  const resetRequest =
    await generate_random_mall_platform_customer_password_resets_create(
      resetConnection,
      {
        body: {
          administratorId: authorized.id,
        },
      },
    );
  typia.assert(resetRequest);
  const token = resetRequest.token;
  const firstReset =
    await api.functional.mallPlatform.customer.password_resets.index(
      resetConnection,
      {
        body: {
          token,
          password: newPassword,
          page: 1,
          limit: 1,
        } satisfies IMallPlatformAdministratorPasswordReset.IRequest,
      },
    );
  typia.assert(firstReset);
  const loginConnection: api.IConnection = { host: connection.host };
  const relogin = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password: newPassword,
    },
  });
  typia.assert(relogin);
  await TestValidator.error(
    "reused password reset token should be rejected",
    async () => {
      await api.functional.mallPlatform.customer.password_resets.index(
        resetConnection,
        {
          body: {
            token,
            password: RandomGenerator.alphaNumeric(20),
            page: 1,
            limit: 1,
          } satisfies IMallPlatformAdministratorPasswordReset.IRequest,
        },
      );
    },
  );
  const finalLoginConnection: api.IConnection = { host: connection.host };
  const finalLogin = await authorize_customer_login(finalLoginConnection, {
    body: {
      email,
      password: newPassword,
    },
  });
  typia.assert(finalLogin);
}
