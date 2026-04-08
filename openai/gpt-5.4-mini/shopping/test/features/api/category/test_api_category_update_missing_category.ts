import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_update_missing_category(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that updating a missing marketplace category is rejected for administrators.
   *
   * This test covers the category update failure path where an administrator submits
   * a valid update payload for a category identifier that does not exist. It validates
   * that the API responds with a not found error and does not proceed with a successful
   * category update when the target resource is unavailable.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Call the category update endpoint with a deterministic missing category UUID and a valid update body.
   * 3. Assert that the request fails with a not found HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin-${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `Passw0rd!${RandomGenerator.alphabets(6)}` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IMallPlatformCategory.IUpdate;
  await TestValidator.httpError(
    "missing category should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.categories.update(
        adminConnection,
        {
          categoryId: "00000000-0000-0000-0000-000000000000",
          body,
        },
      );
    },
  );
}
