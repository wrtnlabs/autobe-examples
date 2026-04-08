import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoriesSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_update_audit_trail_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(adminJoinResult);
  // 2. Create authenticated connection for category operations
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminJoinResult.token.access,
    },
  };
  // 3. Create initial category
  const initialName = "Books";
  const initialDescription = "All types of books";
  const category =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          parent_id: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  const beforeUpdateTimestamp = category.updated_at;
  // 4. Update category with new values
  const updatedName = "Books & Magazines";
  const updatedDescription = "Books, magazines, and digital publications";
  const updateBefore = new Date();
  const updatedCategory =
    await api.functional.ecommerceMall.administrator.categories.putByCategoryid(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  const updateAfter = new Date();
  // 5. Verify update response contains new values
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "updated_at is after update",
    updatedCategory.updated_at > beforeUpdateTimestamp,
  );
  // 6. Retrieve snapshots for the category
  const snapshotsResponse =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Verify at least one snapshot was created
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length >= 1,
  );
  // 8. Find the most recent snapshot (should be the update snapshot)
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // 9. Verify snapshot contains pre-update values
  TestValidator.equals(
    "snapshot name is pre-update value",
    snapshot.name,
    initialName,
  );
  TestValidator.equals(
    "snapshot description is pre-update value",
    snapshot.description,
    initialDescription,
  );
  // 10. Verify snapshot records administrator identity
  TestValidator.equals(
    "snapshot has administrator creator_id",
    snapshot.modifiedBy.id,
    adminJoinResult.id,
  );
  TestValidator.equals(
    "snapshot has administrator display name",
    snapshot.modifiedBy.displayName,
    adminJoinResult.display_name,
  );
  // 11. Verify snapshot timestamp is within update window
  TestValidator.predicate(
    "snapshot created_at is within update window",
    new Date(snapshot.created_at) >= updateBefore &&
      new Date(snapshot.created_at) <= updateAfter,
  );
  // 12. Verify snapshot category reference points to current category
  TestValidator.equals(
    "snapshot references correct category",
    snapshot.category.id,
    category.id,
  );
  TestValidator.equals(
    "snapshot references correct category name",
    snapshot.category.name,
    updatedCategory.name,
  );
  // 13. Verify snapshot has immutable ID
  TestValidator.predicate(
    "snapshot has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );
}
