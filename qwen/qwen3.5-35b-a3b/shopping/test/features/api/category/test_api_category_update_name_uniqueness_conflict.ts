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

export async function test_api_category_update_name_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create two categories at root level with different names
  const categoryName1 = RandomGenerator.name();
  const categoryName2 = RandomGenerator.name();
  // Update first category (creates or updates) with name1
  const category1 = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: { name: categoryName1 } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(category1);
  // Update second category (creates or updates) with name2
  const category2 = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: { name: categoryName2 } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(category2);
  // 3. Try to update category2 with category1's name (should fail due to uniqueness)
  await TestValidator.error(
    "duplicate category name within same parent level",
    async () => {
      await api.functional.ecommerceMall.admin.categories.update(
        adminConnection,
        {
          categoryId: category2.id,
          body: {
            name: categoryName1,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      );
    },
  );
  // 4. Verify category2 name was NOT changed (still has original name2)
  const revalidatedCategory2 =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category2.id,
        body: { name: undefined } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(revalidatedCategory2);
  TestValidator.equals(
    "category name unchanged after uniqueness validation error",
    revalidatedCategory2.name,
    categoryName2,
  );
}
