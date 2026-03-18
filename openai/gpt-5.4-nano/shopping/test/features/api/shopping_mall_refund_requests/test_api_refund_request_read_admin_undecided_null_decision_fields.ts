import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_read_admin_undecided_null_decision_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCreds,
  });
  // 2) Find a refund request in undecided state.
  const refundRequestIds: Array<string & tags.Format<"uuid">> =
    ArrayUtil.repeat(20, () => typia.random<string & tags.Format<"uuid">>());
  let selected: IShoppingMallRefundRequest | undefined;
  for (const refundRequestId of refundRequestIds) {
    try {
      const candidate =
        await api.functional.shoppingMall.admin.admin.refund_requests.at(
          adminConnection,
          {
            refundRequestId,
          },
        );
      typia.assert(candidate);
      if (candidate.sellerComment === null && candidate.decisionedAt === null) {
        selected = candidate;
        break;
      }
    } catch {
      // ignore and try next id
    }
  }
  if (!selected) {
    throw new Error(
      "No undecided refund request could be found within the sampling window.",
    );
  }
  // 3) Call GET again and validate read-only / exact null decision metadata.
  const refundRequestId = selected.id;
  const firstFetch =
    await api.functional.shoppingMall.admin.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(firstFetch);
  TestValidator.equals("sellerComment is null", firstFetch.sellerComment, null);
  TestValidator.equals("decisionedAt is null", firstFetch.decisionedAt, null);
  TestValidator.equals(
    "customerReason matches",
    firstFetch.customerReason,
    selected.customerReason,
  );
  TestValidator.equals("status matches", firstFetch.status, selected.status);
  const secondFetch =
    await api.functional.shoppingMall.admin.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId,
      },
    );
  typia.assert(secondFetch);
  TestValidator.equals("id stable", secondFetch.id, firstFetch.id);
  TestValidator.equals(
    "shoppingMallOrderItemId stable",
    secondFetch.shoppingMallOrderItemId,
    firstFetch.shoppingMallOrderItemId,
  );
  TestValidator.equals(
    "customerReason stable",
    secondFetch.customerReason,
    firstFetch.customerReason,
  );
  TestValidator.equals("status stable", secondFetch.status, firstFetch.status);
  TestValidator.equals(
    "sellerComment stable",
    secondFetch.sellerComment,
    firstFetch.sellerComment,
  );
  TestValidator.equals(
    "decisionedAt stable",
    secondFetch.decisionedAt,
    firstFetch.decisionedAt,
  );
  TestValidator.equals(
    "createdAt stable",
    secondFetch.createdAt,
    firstFetch.createdAt,
  );
  TestValidator.equals(
    "updatedAt stable",
    secondFetch.updatedAt,
    firstFetch.updatedAt,
  );
  TestValidator.equals(
    "deletedAt stable",
    secondFetch.deletedAt,
    firstFetch.deletedAt,
  );
}
