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

/**
 * Test authenticated customer category detail retrieval and immediate hierarchy exposure.
 *
 * Validates that a signed-in customer can retrieve a category detail record and that the response exposes only the immediate category hierarchy fields defined by the DTO. The test focuses on the customer browsing flow and ensures the returned category payload is structurally valid for both the main category and any direct parent or child summaries.
 *
 * This scenario also checks the one-level navigation rule by inspecting only the known summary fields on direct subcategories and the immediate parent category when present. It avoids assuming recursive descendants are present in the payload and keeps the request flow within the customer-facing API surface.
 */
export async function test_api_customer_category_detail_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const category = await api.functional.mallPlatform.customer.categories.at(
    customerConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(category);
  TestValidator.predicate(
    "category id should be present",
    category.id.length > 0,
  );
  TestValidator.predicate(
    "category name should be present",
    category.name.length > 0,
  );
  TestValidator.predicate(
    "category description should be present",
    category.description.length > 0,
  );
  TestValidator.predicate(
    "category createdAt should be present",
    category.createdAt.length > 0,
  );
  TestValidator.predicate(
    "category updatedAt should be present",
    category.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "category deletedAt should be null for active category or a timestamp for historical detail",
    category.deletedAt === null || category.deletedAt.length > 0,
  );
  if (category.parentCategory !== null) {
    TestValidator.predicate(
      "parent category id should be present",
      category.parentCategory.id.length > 0,
    );
    TestValidator.predicate(
      "parent category name should be present",
      category.parentCategory.name.length > 0,
    );
    TestValidator.predicate(
      "parent category description should be present",
      category.parentCategory.description.length > 0,
    );
    TestValidator.predicate(
      "parent category created_at should be present",
      category.parentCategory.created_at.length > 0,
    );
    TestValidator.predicate(
      "parent category updated_at should be present",
      category.parentCategory.updated_at.length > 0,
    );
    TestValidator.predicate(
      "parent category deleted_at should be null for active category or a timestamp for historical detail",
      category.parentCategory.deleted_at === null ||
        category.parentCategory.deleted_at.length > 0,
    );
  }
  TestValidator.predicate(
    "subcategory list should be available as an array",
    Array.isArray(category.subcategories),
  );
  for (const subcategory of category.subcategories) {
    TestValidator.predicate(
      "subcategory id should be present",
      subcategory.id.length > 0,
    );
    TestValidator.predicate(
      "subcategory name should be present",
      subcategory.name.length > 0,
    );
    TestValidator.predicate(
      "subcategory description should be present",
      subcategory.description.length > 0,
    );
    TestValidator.predicate(
      "subcategory created_at should be present",
      subcategory.created_at.length > 0,
    );
    TestValidator.predicate(
      "subcategory updated_at should be present",
      subcategory.updated_at.length > 0,
    );
    TestValidator.predicate(
      "subcategory deleted_at should be null for active category or a timestamp for historical detail",
      subcategory.deleted_at === null || subcategory.deleted_at.length > 0,
    );
  }
}
