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

export async function test_api_category_snapshots_view_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. View category snapshots with default pagination
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.ecommerceMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {} satisfies IEcommerceMallCategoriesSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  typia.assert(result.pagination);
  typia.assert(result.data);
  // 4. Validate pagination defaults
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit default", result.pagination.limit, 20);
  // 5. Validate pagination totals
  const totalPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated",
    result.pagination.pages,
    totalPages,
  );
  // 6. Validate snapshot immutability and structure
  for (const snapshot of result.data) {
    typia.assert(snapshot);
    // Validate snapshot core fields
    TestValidator.equals(
      "entity_type is category",
      snapshot.entity_type,
      "category",
    );
    TestValidator.equals("entity_id matches", snapshot.entity_id, categoryId);
    TestValidator.predicate("name preserved", snapshot.name.length > 0);
    TestValidator.predicate(
      "description exists",
      typeof snapshot.description === "string",
    );
    TestValidator.predicate(
      "created_at is ISO date",
      !isNaN(Date.parse(snapshot.created_at)),
    );
    // Validate category join
    typia.assert(snapshot.category);
    TestValidator.equals(
      "category id matches",
      snapshot.category.id,
      categoryId,
    );
    TestValidator.predicate(
      "category name exists",
      snapshot.category.name.length > 0,
    );
    TestValidator.predicate(
      "category has created_at",
      snapshot.category.created_at !== undefined,
    );
    TestValidator.predicate(
      "category has updated_at",
      snapshot.category.updated_at !== undefined,
    );
    // Validate parent category (nullable join)
    if (snapshot.parentCategory !== null) {
      typia.assert(snapshot.parentCategory);
      TestValidator.predicate(
        "parent category has valid structure",
        snapshot.parentCategory.id.length > 0,
      );
    }
    // Validate administrator join
    typia.assert(snapshot.modifiedBy);
    TestValidator.predicate(
      "modified by has valid id",
      snapshot.modifiedBy.id !== undefined,
    );
    TestValidator.predicate(
      "modified by has valid email",
      snapshot.modifiedBy.email.length > 0,
    );
    TestValidator.predicate(
      "modified by has valid display name",
      snapshot.modifiedBy.displayName.length > 0,
    );
    TestValidator.predicate(
      "modified by has grade",
      snapshot.modifiedBy.grade !== undefined,
    );
    TestValidator.predicate(
      "modified by has banned status",
      typeof snapshot.modifiedBy.isBanned === "boolean",
    );
    TestValidator.predicate(
      "modified by has created at",
      snapshot.modifiedBy.createdAt !== undefined,
    );
    TestValidator.predicate(
      "modified by has updated at",
      snapshot.modifiedBy.updatedAt !== undefined,
    );
  }
  // 7. Validate sorting order (created_at descending)
  if (result.data.length >= 2) {
    for (let i = 1; i < result.data.length; i++) {
      const prevDate = new Date(result.data[i - 1].created_at).getTime();
      const currDate = new Date(result.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is not newer than ${i - 1}`,
        currDate <= prevDate,
      );
    }
  }
}