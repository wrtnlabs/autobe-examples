import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_category_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer category detail retrieval for browseable category navigation.
   *
   * Validates that an authenticated customer can register, retrieve a category by
   * identifier, and inspect the returned detail record used in category browsing.
   * The test focuses on the public display fields and one-level taxonomy context,
   * ensuring category detail responses expose the immediate parent relationship
   * and direct subcategory list without deeper nesting or unrelated product data.
   *
   * 1. Register an authenticated customer using the join utility and isolate the
   *    customer connection from the base connection.
   * 2. Retrieve a category by categoryId through the customer-facing category
   *    detail endpoint.
   * 3. Validate that the response contains the expected category identity and
   *    browse display fields, and that taxonomy remains limited to direct parent
   *    and direct subcategory context.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const category =
    await api.functional.mallPlatform.customer.categories.getByCategoryid(
      customerConnection,
      {
        categoryId,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category id matches requested categoryId",
    category.id,
    categoryId,
  );
  TestValidator.predicate("category name is present", category.name.length > 0);
  TestValidator.predicate(
    "category description is present",
    category.description.length > 0,
  );
  TestValidator.predicate(
    "category subcategories is an array",
    Array.isArray(category.subcategories),
  );
  if (category.parentCategory !== null) {
    TestValidator.predicate(
      "parent category keeps one-level summary shape",
      category.parentCategory.id.length > 0 &&
        category.parentCategory.name.length > 0 &&
        category.parentCategory.description.length > 0,
    );
  }
  for (const subcategory of category.subcategories) {
    TestValidator.equals(
      "subcategory parent links back to current category",
      subcategory.parentCategory?.id,
      category.id,
    );
    TestValidator.predicate(
      "subcategory has display name",
      subcategory.name.length > 0,
    );
    TestValidator.predicate(
      "subcategory has description",
      subcategory.description.length > 0,
    );
    TestValidator.equals(
      "subcategory does not expose deeper nesting",
      subcategory.parentCategory?.parentCategory ?? null,
      null,
    );
  }
}
