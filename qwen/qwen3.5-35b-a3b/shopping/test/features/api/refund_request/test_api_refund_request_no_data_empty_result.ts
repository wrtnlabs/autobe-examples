import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_request_no_data_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Test with default pagination parameters (empty refund requests)
  const emptyResult =
    await api.functional.ecommerceMall.member.refund_requests.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(emptyResult);
  // 3. Validate response structure has data field
  TestValidator.equals("response has data field", emptyResult.data, []);
  TestValidator.equals(
    "response has pagination field",
    emptyResult.pagination !== undefined,
    true,
  );
  // 4. Validate pagination metadata for empty result
  const pagination = emptyResult.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination records count", pagination.records, 0);
  TestValidator.equals("pagination pages count", pagination.pages, 0);
  // Limit should be the actual limit returned by API (may be default or provided)
  TestValidator.predicate(
    "pagination limit is valid positive",
    () => pagination.limit > 0,
  );
  // 5. Test with custom pagination limit
  const customLimitResult =
    await api.functional.ecommerceMall.member.refund_requests.index(
      memberConnection,
      { body: { limit: 10 } },
    );
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit pagination records",
    customLimitResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "custom limit pagination pages",
    customLimitResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "custom limit pagination limit",
    customLimitResult.pagination.limit,
    10,
  );
  // 6. Test with cursor parameter on empty dataset
  const cursorResult =
    await api.functional.ecommerceMall.member.refund_requests.index(
      memberConnection,
      { body: { cursor: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(cursorResult);
  TestValidator.equals(
    "cursor pagination records",
    cursorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "cursor pagination pages",
    cursorResult.pagination.pages,
    0,
  );
  TestValidator.equals("cursor pagination empty data", cursorResult.data, []);
  // 7. Validate data array is strictly empty
  TestValidator.predicate(
    "data array has length 0",
    () => emptyResult.data.length === 0,
  );
  TestValidator.equals("data array length is zero", emptyResult.data.length, 0);
}
