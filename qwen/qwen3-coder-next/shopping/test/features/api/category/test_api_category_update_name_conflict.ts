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

export async function test_api_category_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Initialize admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Step 2: Create parent category
  const parentCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: "00000000-0000-0000-0000-000000000000",
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(parentCategory);
  // Step 3: Create sibling category under same parent
  const siblingCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: "00000000-0000-0000-0000-000000000001",
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(siblingCategory);
  // Step 4: Attempt to rename existing category to match sibling name
  await TestValidator.error(
    "duplicate category name under same parent",
    async () => {
      await api.functional.ecommerceMall.admin.categories.update(
        adminConnection,
        {
          categoryId: parentCategory.id,
          body: {
            name: (siblingCategory as any).name,
          },
        },
      );
    },
  );
}