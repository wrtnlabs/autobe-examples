import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an unauthenticated connection for public access
  const publicConnection: api.IConnection = { host: connection.host };
  // Step 2: Execute the public endpoint without authentication
  const response: IPageIShoppingMallSection.ISummary =
    await api.functional.shoppingMall.admin.sections.index(publicConnection, {
      body: {
        page: 1,
        limit: 10,
        search: undefined,  // Changed from null to undefined to match type '(string & MinLength<1> & MaxLength<255>) | undefined'
      } satisfies IShoppingMallSection.IRequest,
    });
  // Step 3: Validate response structure and data integrity
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("page number", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate each section summary has required fields
  for (const section of response.data) {
    TestValidator.equals("section id is uuid", typeof section.id, "string");
    TestValidator.predicate(
      "section id matches uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        section.id,
      ),
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
    // Validate parent section structure
    if (section.parent != null) { // Fixed: use != null to check for both null and undefined, satisfying TypeScript's strict null checking
      TestValidator.equals(
        "parent section is object",
        typeof section.parent,
        "object",
      );
      TestValidator.equals(
        "parent section id is uuid",
        typeof section.parent.id,
        "string",
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