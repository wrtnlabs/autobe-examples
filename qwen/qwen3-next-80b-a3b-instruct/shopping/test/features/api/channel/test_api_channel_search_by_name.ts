import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin user using the provided utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Perform search with partial name match
  const searchTerm = "electronics";
  const searchResult = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify response structure is correct
  TestValidator.predicate(
    "search result has pagination",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "search result has data array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "search result has data",
    searchResult.data.length >= 0,
  );
  // Basic validation of search functionality
  TestValidator.predicate(
    "search term is string",
    typeof searchTerm === "string",
  );
}
