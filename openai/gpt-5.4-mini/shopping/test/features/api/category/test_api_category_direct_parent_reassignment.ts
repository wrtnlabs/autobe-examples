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

export async function test_api_category_direct_parent_reassignment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an administrator can reassign a category to a different immediate parent category.
   *
   * This test authenticates an administrator with an isolated connection, then exercises the category update endpoint
   * to confirm that a direct parent reassignment is accepted and the returned category preserves the platform's one-level
   * nesting rule. It validates that the updated category points to the requested immediate parent while the parent itself
   * remains a top-level category.
   *
   * 1. Authenticate as an administrator through the provided utility.
   * 2. Update a category's parentCategoryId to a direct parent category.
   * 3. Validate the returned category reflects the reassignment and does not introduce deeper nesting.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const targetCategoryId = typia.random<string & tags.Format<"uuid">>();
  const directParentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const updated =
    await api.functional.mallPlatform.administrator.categories.update(
      adminConnection,
      {
        categoryId: targetCategoryId,
        body: {
          parentCategoryId: directParentCategoryId,
        } satisfies IMallPlatformCategory.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated category should reference the requested direct parent",
    updated.parentCategory?.id,
    directParentCategoryId,
  );
  TestValidator.equals(
    "updated category should preserve its own id",
    updated.id,
    targetCategoryId,
  );
  TestValidator.predicate(
    "updated category should not gain deeper nesting",
    updated.parentCategory === null ||
      updated.parentCategory.parentCategory === null,
  );
}
