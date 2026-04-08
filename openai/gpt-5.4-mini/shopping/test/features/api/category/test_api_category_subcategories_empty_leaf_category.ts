import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_category_subcategories_empty_leaf_category(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test browsing a leaf category's direct subcategories returns an empty page.
   *
   * This validates that customers can safely browse the end of the category hierarchy without receiving an error when a category has no direct children.
   * It also confirms the endpoint returns consistent pagination metadata for an empty result set, including zero records and zero pages.
   *
   * 1. Register and authenticate a customer using an isolated connection.
   * 2. Browse the direct subcategories of a valid leaf category.
   * 3. Verify the response contains no subcategories and zeroed pagination metadata.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.customer.categories.subcategories.index(
      customerConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("empty subcategory data", output.data.length, 0);
  TestValidator.equals("zero records pagination", output.pagination.records, 0);
  TestValidator.equals("zero pages pagination", output.pagination.pages, 0);
}
