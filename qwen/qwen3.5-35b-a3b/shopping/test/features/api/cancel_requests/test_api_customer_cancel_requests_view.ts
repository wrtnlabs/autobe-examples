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

export async function test_api_customer_cancel_requests_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account for testing cancellation requests
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member1);
  // 2. Search cancellation requests for first member (may be empty initially)
  const member1Response =
    await api.functional.ecommerceMall.member.customer.cancel_requests.search(
      member1Connection,
    );
  typia.assert(member1Response);
  // 3. Validate pagination structure has all required fields
  TestValidator.predicate(
    "pagination has current field",
    () => member1Response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit field",
    () => member1Response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records field",
    () => member1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages field",
    () => member1Response.pagination.pages >= 0,
  );
  // 4. Validate records count matches actual data array length
  TestValidator.equals(
    "pagination records matches data array length",
    member1Response.pagination.records,
    member1Response.data.length,
  );
  // 5. Validate data is array of correct type
  for (const item of member1Response.data) {
    typia.assert(item);
    // Validate each cancellation request summary structure
    TestValidator.predicate(
      "cancellation request has valid ID",
      () => item.id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has reason",
      () => item.reason.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has valid status",
      () =>
        item.status === "pending" ||
        item.status === "approved" ||
        item.status === "rejected",
    );
    TestValidator.predicate(
      "cancellation request has order reference",
      () => item.order !== null && item.order.id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has seller reference",
      () => item.seller !== null && item.seller.id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has item reference",
      () => item.item !== null && item.item.id.length > 0,
    );
  }
  // 6. Create second member account to test data isolation
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member2);
  // 7. Search cancellation requests for second member
  const member2Response =
    await api.functional.ecommerceMall.member.customer.cancel_requests.search(
      member2Connection,
    );
  typia.assert(member2Response);
  // 8. Validate pagination metadata is accessible and consistent
  TestValidator.equals(
    "pagination records count matches data length for member 2",
    member2Response.pagination.records,
    member2Response.data.length,
  );
  // 9. Validate both members have independent data (no cross-member visibility)
  // Since no cancellation requests were created, both should have empty arrays
  TestValidator.equals(
    "both members have same record count (no shared data)",
    member1Response.pagination.records,
    member2Response.pagination.records,
  );
  // 10. Verify response structure is consistent between members
  TestValidator.equals(
    "pagination limit is consistent between members",
    member1Response.pagination.limit,
    member2Response.pagination.limit,
  );
  TestValidator.equals(
    "pagination current page is consistent between members",
    member1Response.pagination.current,
    member2Response.pagination.current,
  );
}
