import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer cancellation requests empty state scenario.
 *
 * Validates that when a newly registered customer accesses their cancellation
 * requests list, the API correctly returns an empty result set with proper
 * pagination metadata. This tests the happy path for customers who have not
 * placed any orders and therefore have no cancellation requests to view.
 *
 * The test creates a fresh member account and immediately queries the
 * cancellation requests endpoint without creating any intermediate orders
 * or requests. This ensures the empty state handling is robust and the
 * API doesn't throw errors for legitimate empty responses.
 *
 * 1. Register new member account with randomized credentials.
 * 2. Create authenticated connection for the new customer.
 * 3. Call GET cancellation requests endpoint immediately after registration.
 * 4. Validate response structure matches IPageIEcommerceMallCancellationRequest.ISummary.
 * 5. Verify pagination metadata shows empty state (records: 0, pages: 0, current: 1).
 * 6. Validate data array is empty with length 0.
 */
export async function test_api_customer_cancel_requests_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account
  const joinConnection: IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies DeepPartial<IEcommerceMallMember.IJoin>;
  const joinOutput: IEcommerceMallMember.IAuthorized =
    await api.functional.ecommerceMall.auth.member.join(joinConnection, {
      body: joinInput,
    });
  typia.assert(joinOutput);
  // 2. Create authenticated connection for the new customer
  const customerConnection: IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${joinOutput.token.access}`,
  };
  // 3. Call GET cancellation requests endpoint immediately after registration
  const output: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.cancel_requests.search(
      customerConnection,
    );
  typia.assert(output);
  // 4. Validate response structure matches IPageIEcommerceMallCancellationRequest.ISummary
  TestValidator.notEquals("has pagination object", output.pagination, null);
  TestValidator.notEquals("has data array", output.data, null);
  // 5. Verify pagination metadata shows empty state
  TestValidator.equals(
    "pagination current page is 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals("pagination records is 0", output.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", output.pagination.pages, 0);
  TestValidator.equals("pagination limit is 20", output.pagination.limit, 20);
  // 6. Validate data array is empty with length 0
  TestValidator.equals("data array is empty", output.data.length, 0);
  TestValidator.equals("data array is []", output.data, []);
}
