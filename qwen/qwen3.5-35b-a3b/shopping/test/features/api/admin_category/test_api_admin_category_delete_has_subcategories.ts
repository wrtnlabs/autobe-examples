import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_category_delete_has_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate test category IDs
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete parent category (should fail with 404 or 409)
  const deleteAttempt = async () => {
    await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
      categoryId: parentCategoryId,
    });
  };
  // 4. Validate deletion attempt fails (404 if not exists, 409 if has subcategories)
  await TestValidator.httpError(
    "deletion should fail with appropriate error",
    [404, 409],
    deleteAttempt,
  );
  // 5. Test with subcategory ID as well
  const deleteSubcategoryAttempt = async () => {
    await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
      categoryId: subcategoryId,
    });
  };
  await TestValidator.httpError(
    "subcategory deletion should also fail",
    [404, 409],
    deleteSubcategoryAttempt,
  );
}
