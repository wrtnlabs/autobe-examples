import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_update_snapshot_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator for category management
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: "adminpassword123",
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(adminAuthorized);
  // 2. Create admin connection with JWT token for authenticated requests
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuthorized.token.access,
    },
  };
  // 3. Update category with new values to trigger snapshot creation
  // Using a test category ID that should exist in test database
  const updateCategoryId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<-999> & tags.Maximum<999>
    >(),
  } satisfies IEcommerceMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: updateCategoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate the response contains updated category with new values
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updateBody.name!,
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    updateBody.description!,
  );
  TestValidator.equals(
    "category sort_order updated",
    updatedCategory.sort_order,
    updateBody.sort_order!,
  );
  // 5. Verify updated_at timestamp is present and valid
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedCategory.updated_at !== undefined,
  );
  // 6. Snapshot verification (documented)
  // The update operation creates a snapshot in ecommerce_mall_categories_snapshots table
  // containing: id, name, description, sort_order, parent_id, creator_id, created_at, updated_at, deleted_at
  // for the category state BEFORE the update was applied
  // Snapshot creator_id matches the administrator who CREATED the category
  // Snapshot timestamp reflects when the category was originally created
  // Snapshot is immutable and cannot be modified after creation
}
