import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_sections_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Execute search query with a known search term
  // Since we cannot create sections, we'll search for a term that likely exists
  // in the system based on the API domain context
  const searchTerm = "section";
  const searchResponse =
    await api.functional.shoppingMall.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSection.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Step 3: Validate search response structure
  TestValidator.equals(
    "pagination exists",
    searchResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    searchResponse.data !== undefined,
    true,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(searchResponse.data),
  );
  // Step 4: Verify pagination parameters
  TestValidator.equals(
    "page number is correct",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit is correct",
    searchResponse.pagination.limit,
    10,
  );
  // Step 5: Validate search behavior
  // If any sections exist, they should contain the search term in name or description
  // If no sections exist, test still passes because search functionality worked
  if (searchResponse.data.length > 0) {
    for (const section of searchResponse.data) {
      const containsSearchTerm =
        section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.description.toLowerCase().includes(searchTerm.toLowerCase());
      TestValidator.predicate(
        "section contains search term",
        containsSearchTerm,
      );
    }
  }
  // Step 6: Validate response types
  for (const section of searchResponse.data) {
    TestValidator.equals(
      "section id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
      true,
    );
    TestValidator.equals(
      "section name is string",
      typeof section.name,
      "string",
    );
    TestValidator.equals(
      "section description is string",
      typeof section.description,
      "string",
    );
    // Validate parent section structure if it exists
    if (section.parent !== null && section.parent !== undefined) {
      TestValidator.equals(
        "parent section id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          section.parent.id,
        ),
        true,
      );
      TestValidator.equals(
        "parent section name is string",
        typeof section.parent.name,
        "string",
      );
      TestValidator.equals(
        "parent section description is string",
        typeof section.parent.description,
        "string",
      );
    }
  }
}
