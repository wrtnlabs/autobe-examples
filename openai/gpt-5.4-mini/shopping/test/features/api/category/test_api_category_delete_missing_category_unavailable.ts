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

export async function test_api_category_delete_missing_category_unavailable(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that deleting a non-existent category is treated as an unavailable
   * target and does not proceed with any marketplace taxonomy mutation.
   *
   * The test authenticates as an administrator, then calls the category delete
   * endpoint with a random UUID that is expected to be missing. The important
   * business rule is that the server must reject the request as a missing
   * category rather than silently succeeding or mutating unrelated catalog data.
   *
   * 1. Authenticate a dedicated administrator connection.
   * 2. Call the category deletion endpoint using a random UUID.
   * 3. Assert that the request fails with a missing-resource HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const missingCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing category should return a not-found error",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.categories.erase(
        adminConnection,
        {
          categoryId: missingCategoryId,
        },
      );
    },
  );
}
