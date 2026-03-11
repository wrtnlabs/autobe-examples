import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_update_by_admin_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Use an existing category ID (in real scenario, you might list categories first)
  const testCategoryId = "123e4567-e89b-12d3-a456-426614174000"; // Example UUID
  // 3. Update category with new name and description
  const newName = RandomGenerator.name(3);
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    name: newName,
    description: newDescription,
  } satisfies IEcommerceMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: testCategoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate update results based on snapshot structure
  // The response is a snapshot with before/after values
  TestValidator.equals(
    "after_name updated",
    updatedCategory.after_name,
    newName,
  );
  TestValidator.equals(
    "after_description updated",
    updatedCategory.after_description,
    newDescription,
  );
  TestValidator.equals(
    "snapshot_type is edit",
    updatedCategory.snapshot_type,
    "edit",
  );
  TestValidator.predicate(
    "category_id matches",
    updatedCategory.category_id === testCategoryId,
  );
}
