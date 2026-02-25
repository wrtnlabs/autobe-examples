import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemReferenceData";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reference_data_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test paginated reference data retrieval with default pagination
  const result = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.predicate("has pagination", result.pagination.current >= 0);
  TestValidator.predicate("has limit", result.pagination.limit > 0);
  TestValidator.predicate("has records", result.pagination.records >= 0);
  TestValidator.predicate("has pages", result.pagination.pages >= 0);
  // Validate data array exists
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Validate each reference data item structure
  for (const item of result.data) {
    TestValidator.predicate("has id", typeof item.id === "string");
    TestValidator.predicate("has name", typeof item.name === "string");
    TestValidator.predicate("has value", typeof item.value === "string");
    TestValidator.predicate("has label", typeof item.label === "string");
    TestValidator.predicate(
      "has is_active",
      typeof item.is_active === "boolean",
    );
  }
}
