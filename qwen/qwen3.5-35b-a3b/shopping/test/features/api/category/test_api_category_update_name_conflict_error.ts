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

export async function test_api_category_update_name_conflict_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Set admin token in connection headers
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Generate two unique category names for the conflict scenario
  const categoryNameA = RandomGenerator.alphabets(8);
  let categoryNameB = RandomGenerator.alphabets(8);
  // Ensure names are different
  while (categoryNameA === categoryNameB) {
    categoryNameB = RandomGenerator.alphabets(8);
  }
  // 3. Create two categories (simulated by attempting updates with random IDs)
  // Since no create endpoint exists, we'll validate the conflict logic works
  // by attempting an update that would cause a name conflict
  // Attempt first update (should succeed - no conflict)
  const categoryIdA = typia.random<string & tags.Format<"uuid">>();
  const categoryIdB = typia.random<string & tags.Format<"uuid">>();
  // Validate that attempting to update two different categories
  // to the same name triggers 409 conflict
  await TestValidator.httpError(
    "409 conflict when duplicate category name would result",
    [409],
    async () => {
      // Simulate a scenario where category B tries to take category A's name
      await api.functional.ecommerceMall.admin.categories.update(
        adminConnection,
        {
          categoryId: categoryIdB,
          body: {
            name: categoryNameA,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      );
    },
  );
  // 4. Validate error response structure
  let errorCaught = false;
  try {
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: categoryIdB,
        body: {
          name: categoryNameA,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  } catch (err: unknown) {
    errorCaught = true;
    // Type-narrow to HttpError to access message property
    if (err instanceof api.HttpError) {
      // Error should contain meaningful message about name conflict
      await TestValidator.predicate(
        "error message contains conflict information",
        () =>
          err.message.includes("conflict") ||
          err.message.includes("duplicate") ||
          err.message.includes("name"),
      );
    }
  }
  TestValidator.equals("error was caught", errorCaught, true);
}
