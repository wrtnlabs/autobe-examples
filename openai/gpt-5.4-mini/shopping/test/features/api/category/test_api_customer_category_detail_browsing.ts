import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_detail_browsing(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const category: IMallPlatformCategory =
    await api.functional.mallPlatform.customer.categories.at(
      customerConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(category);
  TestValidator.predicate("category id is present", category.id.length > 0);
  TestValidator.predicate("category name is present", category.name.length > 0);
  TestValidator.predicate(
    "category description is present",
    category.description.length > 0,
  );
  TestValidator.predicate(
    "category has created timestamp",
    category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has updated timestamp",
    category.updated_at.length > 0,
  );
  TestValidator.equals(
    "active category is not soft-deleted",
    category.deleted_at,
    null,
  );
  TestValidator.equals(
    "category parentCategory is nullable",
    category.parentCategory,
    null,
  );
  TestValidator.predicate(
    "category subcategories are browseable summaries",
    Array.isArray(category.subcategories),
  );
}
