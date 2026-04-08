import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_empty_result_browse(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify empty-result customer session browsing returns a valid paginated response.
   *
   * This test authenticates a customer, then queries the customer session browsing endpoint with a non-matching search criterion that should not match any existing session records. It validates that the service responds with a structurally correct empty page and preserves safe-output behavior by returning no session items when no records match.
   *
   * 1. Register and authenticate a customer using an isolated actor connection.
   * 2. Query the session browsing endpoint with a unique search string that should match no sessions.
   * 3. Validate the response as an empty page with zero records and consistent pagination metadata.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    search: "no-matching-session-search-keyword-9f2b3c1a",
    page: 1,
    limit: 20,
    sort: "created_at",
    order: "desc",
  } satisfies IMallPlatformCustomerSession.IRequest;
  const output = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    { body: request },
  );
  typia.assert(output);
  TestValidator.equals("empty session list", output.data.length, 0);
  TestValidator.equals("empty session records", output.pagination.records, 0);
  TestValidator.equals("empty session pages", output.pagination.pages, 0);
  TestValidator.equals(
    "requested page preserved",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit preserved",
    output.pagination.limit,
    20,
  );
}
