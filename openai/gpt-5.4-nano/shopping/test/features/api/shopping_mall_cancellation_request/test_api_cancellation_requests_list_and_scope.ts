import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_cancellation_requests_list_and_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A auth
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2) Create an order item for member A
  const memberAOrderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberAConnection,
      {},
    );
  typia.assert(memberAOrderItem);
  // 3) Create a cancellation request for member A (should start undecided)
  const memberACancellation =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberAConnection,
      {
        body: {
          orderItemId: memberAOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(memberACancellation);
  TestValidator.equals(
    "member A cancellation seller_decisioned_at should be null initially",
    memberACancellation.sellerDecisionedAt,
    null,
  );
  // Scenario 1: list with filter + pagination
  const pageLimit = 10;
  const requestForListA = {
    page: 1,
    limit: pageLimit,
    shoppingMallOrderItemId: memberAOrderItem.id,
    sortBy: "created_at",
    sortDirection: "desc",
    status: memberACancellation.status,
    includeDeleted: false,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const listA =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberAConnection,
      {
        body: requestForListA,
      },
    );
  typia.assert(listA);
  TestValidator.equals("pagination current", listA.pagination.current, 1);
  TestValidator.equals("pagination limit", listA.pagination.limit, pageLimit);
  TestValidator.equals(
    "pagination pages consistent",
    listA.pagination.pages,
    Math.ceil(listA.pagination.records / pageLimit),
  );
  TestValidator.predicate(
    "data length within limit",
    listA.data.length <= pageLimit,
  );
  for (const item of listA.data) {
    TestValidator.equals(
      "returned order item id matches filter",
      item.shopping_mall_order_item_id,
      memberAOrderItem.id,
    );
    TestValidator.equals(
      "includeDeleted=false implies deleted_at null",
      item.deleted_at,
      null,
    );
  }
  // 4) Member B auth (separate identity)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuth);
  const memberBOrderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberBConnection,
      {},
    );
  typia.assert(memberBOrderItem);
  const memberBCancellation =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberBConnection,
      {
        body: {
          orderItemId: memberBOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(memberBCancellation);
  TestValidator.equals(
    "member B cancellation seller_decisioned_at should be null initially",
    memberBCancellation.sellerDecisionedAt,
    null,
  );
  // Scenario 2: Member A should not see Member B cancellation requests
  const requestForListAExcludeB = {
    page: 1,
    limit: pageLimit,
    shoppingMallOrderItemId: memberBOrderItem.id,
    sortBy: "created_at",
    sortDirection: "desc",
    status: memberBCancellation.status,
    includeDeleted: false,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const listAOnBItem =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberAConnection,
      {
        body: requestForListAExcludeB,
      },
    );
  typia.assert(listAOnBItem);
  TestValidator.equals(
    "member A should not see member B records",
    listAOnBItem.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 when no data",
    listAOnBItem.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 when no records",
    listAOnBItem.pagination.pages,
    0,
  );
  // Scenario 3: Attempt to force workflow transition via PATCH with intent fields
  const maliciousIntentStatus = `${memberACancellation.status}_malicious`;
  const requestIntent = {
    page: 1,
    limit: 10,
    shoppingMallOrderItemId: memberAOrderItem.id,
    includeDeleted: false,
    status: memberACancellation.status,
    newStatus: maliciousIntentStatus,
    sellerDecisionedAt: new Date().toISOString(),
    sellerResponseReason: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallCancellationRequest.IRequest;
  try {
    const intentResult =
      await api.functional.shoppingMall.member.cancellation_requests.index(
        memberAConnection,
        { body: requestIntent },
      );
    typia.assert(intentResult);
  } catch {
    // If business rules reject the intent, that's acceptable.
  }
  // Verify unchanged by re-listing using current known undecided request status
  const requestForVerifyUnchanged = {
    page: 1,
    limit: 10,
    shoppingMallOrderItemId: memberAOrderItem.id,
    sortBy: "created_at",
    sortDirection: "desc",
    status: memberACancellation.status,
    includeDeleted: false,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const listAfterIntent =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberAConnection,
      {
        body: requestForVerifyUnchanged,
      },
    );
  typia.assert(listAfterIntent);
  // Find the original cancellation request by id to ensure exact fields not mutated
  const found = listAfterIntent.data.find(
    (x) => x.id === memberACancellation.id,
  );
  TestValidator.predicate(
    "original cancellation request still present after intent",
    found !== undefined,
  );
  if (found) {
    TestValidator.equals(
      "status unchanged after malicious intent",
      found.status,
      memberACancellation.status,
    );
    TestValidator.equals(
      "seller_decisioned_at remains null after malicious intent",
      found.seller_decisioned_at,
      null,
    );
    TestValidator.equals(
      "seller_response_reason remains null after malicious intent",
      found.seller_response_reason,
      null,
    );
  }
}
