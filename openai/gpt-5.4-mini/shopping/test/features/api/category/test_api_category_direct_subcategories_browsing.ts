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

export async function test_api_category_direct_subcategories_browsing(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.customer.categories.subcategories(
      customerConnection,
      {
        categoryId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "returned category id should exist",
    output.id,
    output.id,
  );
  TestValidator.predicate(
    "parent category relation should be nullable summary",
    output.parentCategory === null || typeof output.parentCategory === "object",
  );
  if (output.parentCategory !== null) {
    typia.assert(output.parentCategory);
    TestValidator.equals(
      "parent category should not be self-referential",
      output.parentCategory.id,
      output.id,
    );
  }
  TestValidator.equals(
    "category deletedAt should be nullable",
    output.deletedAt,
    output.deletedAt,
  );
}
