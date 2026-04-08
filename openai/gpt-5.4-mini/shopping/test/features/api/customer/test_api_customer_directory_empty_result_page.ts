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

/**
 * Verify the administrator customer directory returns an empty paginated page for unmatched criteria.
 *
 * Validates that an authenticated administrator can query the customer directory with filters that match no accounts and still receive a normal paginated response shape. The test checks that empty results are represented as zero records, zero pages, and an empty data array instead of an error response.
 *
 * It also confirms that pagination parameters are honored on empty pages and that the endpoint remains usable for a subsequent search with a different filter set.
 *
 * 1. Authenticate as an administrator using the administrator registration endpoint.
 * 2. Query the customer directory with an impossible filter combination and explicit pagination controls.
 * 3. Validate the response shape for an empty page.
 * 4. Perform a follow-up query to confirm the endpoint is still usable after an empty result.
 */
export async function test_api_customer_directory_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.mallPlatform.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
        password: `${RandomGenerator.alphabets(12)}!1A` satisfies string,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const emptyPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(16),
          email:
            `${RandomGenerator.alphabets(10)}@invalid.test` satisfies string,
          status: "definitely-not-a-real-status",
          page: 3,
          limit: 7,
          sort: "-created_at",
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page record count",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty page total pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 3);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 7);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  const followUpPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort: "+created_at",
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(followUpPage);
  TestValidator.predicate(
    "follow-up request remains usable",
    followUpPage.pagination.current >= 1,
  );
}
