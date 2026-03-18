import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_requests_member_list_scoped_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1) member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAId = memberA.id;
  // 2) member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBId = memberB.id;
  // 3) create refund request for member A (and keep its order item id)
  const refundA =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberAConnection,
      {},
    );
  typia.assert(refundA);
  const refundAId = refundA.id;
  const refundAOrderItemId = refundA.shoppingMallOrderItemId;
  // 4) create refund request for member B
  const refundB =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberBConnection,
      {},
    );
  typia.assert(refundB);
  const refundBId = refundB.id;
  const refundBOrderItemId = refundB.shoppingMallOrderItemId;
  // Ensure distinctness for meaningful exclusion checks
  TestValidator.notEquals(
    "refund request ids should differ between members",
    refundAId,
    refundBId,
  );
  TestValidator.notEquals(
    "order item ids should differ between members",
    refundAOrderItemId,
    refundBOrderItemId,
  );
  // 5-6) member A list
  const listA = await api.functional.shoppingMall.member.refund_requests.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 50,
        sellerComment: null,
        decisionedAt: null,
        status: undefined,
        shoppingMallOrderItemId: undefined,
        customerReason: undefined,
        createdAt: undefined,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(listA);
  const idsA = listA.data.map((x) => x.id);
  TestValidator.predicate(
    "member A list should include its refund request",
    () => idsA.includes(refundAId),
  );
  TestValidator.predicate(
    "member A list should exclude member B refund request",
    () => !idsA.includes(refundBId),
  );
  const returnedA = listA.data.find((x) => x.id === refundAId);
  TestValidator.predicate(
    "returned record for member A refund exists",
    () => returnedA !== undefined,
  );
  if (returnedA !== undefined) {
    TestValidator.equals(
      "shoppingMallOrderItemId for returned refund A must match A's order item",
      returnedA.shoppingMallOrderItemId,
      refundAOrderItemId,
    );
  }
  // 7-8) member B list
  const listB = await api.functional.shoppingMall.member.refund_requests.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 50,
        sellerComment: null,
        decisionedAt: null,
        status: undefined,
        shoppingMallOrderItemId: undefined,
        customerReason: undefined,
        createdAt: undefined,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(listB);
  const idsB = listB.data.map((x) => x.id);
  TestValidator.predicate(
    "member B list should include its refund request",
    () => idsB.includes(refundBId),
  );
  TestValidator.predicate(
    "member B list should exclude member A refund request",
    () => !idsB.includes(refundAId),
  );
  const returnedB = listB.data.find((x) => x.id === refundBId);
  TestValidator.predicate(
    "returned record for member B refund exists",
    () => returnedB !== undefined,
  );
  if (returnedB !== undefined) {
    TestValidator.equals(
      "shoppingMallOrderItemId for returned refund B must match B's order item",
      returnedB.shoppingMallOrderItemId,
      refundBOrderItemId,
    );
  }
  TestValidator.equals("member A identity sanity", memberAId, memberA.id);
  TestValidator.equals("member B identity sanity", memberBId, memberB.id);
}
