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

export async function test_api_category_subcategories_browse_direct_children(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test browsing direct child categories for a customer session.
   *
   * Validates the direct-subcategory browse contract by authenticating a
   * customer, calling the category subcategory endpoint, and checking that the
   * paginated response is structurally valid. It also verifies the request uses
   * stable pagination controls and that each returned category summary carries a
   * parentCategory reference rather than exposing category-management-only data.
   *
   * 1. Register an isolated customer connection.
   * 2. Browse the subcategory list for a category identifier.
   * 3. Validate pagination metadata and category summary relationships.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.categories.subcategories.index(
      customerConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 3 }),
          ),
          page: 1,
          limit: 10,
          sort: "name_asc",
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match request",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "subcategory browse should return an array",
    Array.isArray(output.data),
  );
  for (const category of output.data) {
    TestValidator.predicate(
      "subcategory should have an attached parent category",
      category.parentCategory !== null,
    );
  }
}
