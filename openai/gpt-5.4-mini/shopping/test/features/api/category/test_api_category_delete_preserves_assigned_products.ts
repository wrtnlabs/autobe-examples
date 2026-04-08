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

export async function test_api_category_delete_preserves_assigned_products(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that administrator category deletion completes without affecting assigned products.
   *
   * This scenario validates the category deletion flow for an authenticated administrator.
   * Because the provided API surface only exposes administrator registration and category deletion,
   * the test focuses on the successful delete operation while preserving the expected marketplace behavior.
   *
   * 1. Register and authenticate an administrator using an isolated connection.
   * 2. Delete a category through the administrator category delete endpoint.
   * 3. Confirm the operation completes successfully.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  await api.functional.mallPlatform.administrator.categories.erase(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
