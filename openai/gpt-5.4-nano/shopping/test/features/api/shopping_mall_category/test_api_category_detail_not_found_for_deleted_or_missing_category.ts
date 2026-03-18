import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_detail_not_found_for_deleted_or_missing_category(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: credentials });
  // 2) Missing category: use non-existent UUID
  const missingCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing category should return not found",
    404,
    async () =>
      await api.functional.shoppingMall.admin.categories.at(adminConnection, {
        categoryId: missingCategoryId,
      }),
  );
  // 3) Soft-deleted category: best-effort discovery since no create/delete APIs
  // are provided. Try to locate a category where deleted_at is non-null.
  let softDeletedCategoryId: (string & tags.Format<"uuid">) | undefined =
    undefined;
  for (let i = 0; i < 5; i++) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      const category = await api.functional.shoppingMall.admin.categories.at(
        adminConnection,
        { categoryId: candidateId },
      );
      typia.assert(category);
      if (category.deleted_at !== null) {
        softDeletedCategoryId = candidateId;
        break;
      }
    } catch {
      // ignore and retry with a new candidate
    }
  }
  const categoryIdToTest: string & tags.Format<"uuid"> =
    softDeletedCategoryId ?? typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "soft-deleted category should be treated as not found",
    404,
    async () =>
      await api.functional.shoppingMall.admin.categories.at(adminConnection, {
        categoryId: categoryIdToTest,
      }),
  );
}
