import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refund request list data isolation between member accounts.
 *
 * Validates that the refund request list endpoint properly isolates data by authenticated member context. Each member should only see their own refund requests and cannot access other members' refund request information through the API.
 *
 * The test creates two separate member accounts with unique credentials, establishes authenticated connections for each member, and calls the refund request list endpoint for both. It verifies that the response structure is correct and that any refund requests returned are properly scoped to the authenticated member's context.
 *
 * 1. Member A registers with unique email and receives authentication tokens.
 * 2. Member B registers with different unique email and receives authentication tokens.
 * 3. Member A calls PATCH /shoppingMall/member/refund-requests with their authenticated connection.
 * 4. Validates response structure and data array through typia.assert().
 * 5. Member B calls the same endpoint with their authenticated connection.
 * 6. Validates response structure and verifies data isolation by checking member context.
 * 7. Confirms that each member's refund requests (if any) belong to their own account.
 */
export async function test_api_refund_request_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A account
  const memberA = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create member B account with different credentials
  const memberB = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create authenticated connections for each member
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  const memberBConnection: api.IConnection = { host: connection.host };
  memberBConnection.headers = {
    Authorization: `Bearer ${memberB.token.access}`,
  };
  // 4. Member A retrieves their refund requests
  const memberARefundRequests =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(memberARefundRequests);
  // 5. Member B retrieves their refund requests
  const memberBRefundRequests =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberBConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(memberBRefundRequests);
  // 6. Verify member A and B have different IDs (isolation baseline)
  TestValidator.notEquals(
    "member A and B have different IDs",
    memberA.id,
    memberB.id,
  );
  // 7. Verify data isolation - each member's refund requests belong to them
  // Check member A's refund requests all belong to member A
  for (const refundRequest of memberARefundRequests.data) {
    TestValidator.equals(
      "member A refund request belongs to member A",
      refundRequest.member.id,
      memberA.id,
    );
  }
  // Check member B's refund requests all belong to member B
  for (const refundRequest of memberBRefundRequests.data) {
    TestValidator.equals(
      "member B refund request belongs to member B",
      refundRequest.member.id,
      memberB.id,
    );
  }
}
