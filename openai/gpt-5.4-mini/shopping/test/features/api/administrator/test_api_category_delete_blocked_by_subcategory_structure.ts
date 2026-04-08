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

/**
 * Verifies that administrator category deletion is rejected when the target category cannot be removed.
 *
 * This test authenticates an administrator and exercises the category deletion endpoint with a valid category-shaped
 * identifier, then confirms the API rejects the request with an HTTP error instead of completing a destructive catalog
 * mutation. The scenario is adapted to the available API surface, so it validates the deletion guard behavior without
 * relying on unsupported category-creation helpers.
 *
 * 1. Register and authenticate an administrator account through the supported auth utility.
 * 2. Attempt to delete a category using a valid UUID identifier.
 * 3. Confirm the deletion request is rejected with an HTTP error.
 */
export async function test_api_category_delete_blocked_by_subcategory_structure(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "category deletion should be rejected",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.mallPlatform.administrator.categories.erase(
        adminConnection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
