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
export async function test_api_sections_retrieval_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Step 2: Prepare the request with default pagination parameters
  const request: IShoppingMallSection.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSection.IRequest;
  // Step 3: Call the API to retrieve sections
  const response: IPageIShoppingMallSection.ISummary =
    await api.functional.shoppingMall.superAdmin.sections.index(
      superAdminConnection,
      {
        body: request,
      },
    );
  // Step 4: Validate response structure and content
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("pagination page is 1", response.pagination.current, 1);
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data array has expected type",
    response.data.length === 0 ||
      response.data.every(
        (item) =>
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.description === "string",
      ),
  );
  // Validate hierarchical relationships:
  // - parent property should be either null or another section summary
  // - child sections must have parent references pointing to their parent sections
  response.data.forEach((item) => {
    // parent should be either null or section summary object
    const parent = item.parent;
    TestValidator.predicate(
      "parent is null or section",
      parent === null ||
        (parent !== null &&
          parent !== undefined &&
          typeof parent.id === "string" &&
          typeof parent.name === "string" &&
          typeof parent.description === "string"),
    );
  });
}
