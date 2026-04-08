import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_account_empty_result_listing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator customer browsing returns an empty page when no accounts match the query.
   *
   * This test authenticates an administrator, queries the customer registry with criteria expected to match no customer records, and validates that the response is a successful empty paginated list.
   *
   * It confirms the endpoint returns only customer summary data, preserves correct pagination metadata for the empty result set, and does not require any mutable state to succeed.
   *
   * 1. Authenticate as an administrator using a dedicated connection.
   * 2. Request the customer registry with criteria expected to match no accounts.
   * 3. Validate the response is a paginated empty list with accurate metadata.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.customers.index(
      administratorConnection,
      {
        body: {
          search: `no-match-${RandomGenerator.alphabets(12)}`,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("empty result data", output.data.length, 0);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
}
