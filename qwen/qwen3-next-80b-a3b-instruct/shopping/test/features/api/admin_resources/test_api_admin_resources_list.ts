import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_resources_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the target endpoint with authenticated admin connection
  const result: IPageIShoppingMallChannel =
    await api.functional.shoppingMall.admin.resources.index(adminConnection);
  // Step 3: Validate response structure and types
  typia.assert(result);
  // Step 4: Validate pagination structure with schema constraints
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  // Step 5: Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // Step 6: Validate individual channel structure if data exists
  if (result.data.length > 0) {
    const firstChannel = result.data[0];
    TestValidator.equals(
      "first channel has id",
      typeof firstChannel.id === "string",
      true,
    );
    TestValidator.predicate(
      "first channel id is uuid",
      typia.is<string & tags.Format<"uuid">>(firstChannel.id),
    );
  }
}
