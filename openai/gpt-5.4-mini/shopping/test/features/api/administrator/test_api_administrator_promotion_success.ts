import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates administrator promotion from regular administrator to super administrator.
   *
   * This scenario exercises the governance flow for privilege elevation by creating a
   * target administrator account and invoking the promotion endpoint. It verifies that
   * the request completes without error and that the promotion path accepts a valid
   * administrator identifier under the authenticated administrator session used for the
   * test.
   *
   * 1. Create a target administrator account.
   * 2. Invoke the promotion endpoint against the target administrator identifier.
   * 3. Confirm the operation completes successfully.
   */
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_administrator_join(targetConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(target);
  await api.functional.mallPlatform.administrator.administrators.promote(
    targetConnection,
    {
      administratorId: target.id,
    },
  );
}
