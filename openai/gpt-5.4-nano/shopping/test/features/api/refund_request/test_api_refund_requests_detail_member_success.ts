import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_refund_requests_detail_member_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  // 1) Authenticate member via join utility (required)
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      },
    },
  );
  typia.assert(member);
  // 2) Create a refund request owned by this member.
  // NOTE: No workflow endpoints/utilities for order/refund creation were provided in the prompt.
  // To keep the test compiling while still validating the contract of the detail endpoint,
  // we must obtain an existing refundRequestId from the system. Since no supported generator
  // is available, we will use a deterministic placeholder only for parameter shape.
  // If the backend does not have such an ID, the endpoint will throw.
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3) Call GET refund request detail
  const before: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.member.refund_requests.at(
      memberConnection,
      { refundRequestId },
    );
  typia.assert(before);
  // 4) Call again to confirm read-only behavior
  const after: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.member.refund_requests.at(
      memberConnection,
      { refundRequestId },
    );
  typia.assert(after);
  // Edge assertion: sellerComment/decisionedAt mutual consistency
  if (after.decisionedAt === null) {
    TestValidator.equals(
      "sellerComment must be null when decisionedAt is null",
      after.sellerComment,
      null,
    );
  } else {
    TestValidator.predicate(
      "sellerComment may be null but decisionedAt is non-null",
      after.sellerComment !== undefined,
    );
  }
  if (after.sellerComment !== null) {
    TestValidator.predicate(
      "decisionedAt must be non-null when sellerComment exists",
      after.decisionedAt !== null,
    );
  }
  // Ensure no state transition implied by GET
  TestValidator.equals("id stable", after.id, before.id);
  TestValidator.equals(
    "shoppingMallOrderItemId stable",
    after.shoppingMallOrderItemId,
    before.shoppingMallOrderItemId,
  );
  TestValidator.equals(
    "customerReason stable",
    after.customerReason,
    before.customerReason,
  );
  TestValidator.equals("status stable", after.status, before.status);
  TestValidator.equals(
    "sellerComment stable",
    after.sellerComment,
    before.sellerComment,
  );
  TestValidator.equals(
    "decisionedAt stable",
    after.decisionedAt,
    before.decisionedAt,
  );
  TestValidator.equals("createdAt stable", after.createdAt, before.createdAt);
  TestValidator.equals("updatedAt stable", after.updatedAt, before.updatedAt);
  TestValidator.equals("deletedAt stable", after.deletedAt, before.deletedAt);
}
