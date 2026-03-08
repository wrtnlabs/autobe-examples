import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_deleted_category_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs for non-existent categories
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Non-existent category should throw HttpError with 404 status
  try {
    const category: IEcommerceMallCategory =
      await api.functional.ecommerceMall.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    typia.assert(category);
    throw new Error(
      "Expected HttpError 404 for non-existent category but request succeeded",
    );
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) {
      throw new Error(`Expected HttpError but got ${typeof error}: ${error}`);
    }
    if (error.status !== 404) {
      throw new Error(
        `Expected status 404 but got ${error.status}: ${error.message}`,
      );
    }
  }
  // Test 2: Another non-existent category UUID should also return 404
  const anotherNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  try {
    const category: IEcommerceMallCategory =
      await api.functional.ecommerceMall.categories.at(connection, {
        categoryId: anotherNonExistentId,
      });
    typia.assert(category);
    throw new Error(
      "Expected HttpError 404 for non-existent category but request succeeded",
    );
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) {
      throw new Error(`Expected HttpError but got ${typeof error}: ${error}`);
    }
    if (error.status !== 404) {
      throw new Error(
        `Expected status 404 but got ${error.status}: ${error.message}`,
      );
    }
  }
  // Note: Full soft-delete testing requires admin category management functions
  // (create, delete) and authentication utilities which are not available in
  // the provided SDK. The test above validates the 404 behavior for
  // non-existent categories, which is part of the soft-delete access control.
  //
  // To fully test admin vs customer access to deleted categories, the following
  // would be needed:
  // 1. Admin authentication utility (authorize_admin_login)
  // 2. Admin category creation (api.functional.admin.categories.create)
  // 3. Admin category deletion (api.functional.admin.categories.delete)
  // 4. Customer authentication utility (authorize_customer_login)
  // 5. Customer connection for testing 404 on deleted category
}
