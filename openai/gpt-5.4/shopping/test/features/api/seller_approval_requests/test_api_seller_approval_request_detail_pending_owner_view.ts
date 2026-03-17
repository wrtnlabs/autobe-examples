import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_detail_pending_owner_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  TestValidator.equals(
    "seller registration starts with pending approval status",
    joined.approval_status,
    "pending",
  );
  TestValidator.equals(
    "newly joined seller has no rejection reason",
    joined.rejection_reason,
    null,
  );
  const sellerApprovalRequestId = joined.id;
  const detail =
    await api.functional.shoppingMall.seller.seller_approval_requests.at(
      sellerConnection,
      {
        sellerApprovalRequestId,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "request id matches queried id",
    detail.id,
    sellerApprovalRequestId,
  );
  TestValidator.equals("request remains pending", detail.status, "pending");
  TestValidator.equals(
    "pending request has no reviewer yet",
    detail.reviewer,
    null,
  );
  TestValidator.equals(
    "pending request has no reviewed timestamp",
    detail.reviewed_at,
    null,
  );
  TestValidator.equals(
    "nested seller is the authenticated seller",
    detail.seller.id,
    joined.id,
  );
  TestValidator.equals(
    "nested seller email matches authenticated seller",
    detail.seller.email,
    joined.email,
  );
  TestValidator.equals(
    "nested seller approval status matches seller account",
    detail.seller.approval_status,
    joined.approval_status,
  );
  TestValidator.equals(
    "nested seller rejection reason matches seller account",
    detail.seller.rejection_reason,
    joined.rejection_reason,
  );
  TestValidator.equals(
    "nested seller suspended flag matches seller account",
    detail.seller.suspended,
    joined.suspended,
  );
  TestValidator.equals(
    "nested seller banned flag matches seller account",
    detail.seller.banned,
    joined.banned,
  );
  TestValidator.equals(
    "nested seller deleted timestamp matches seller account",
    detail.seller.deleted_at,
    joined.deleted_at,
  );
  const reread =
    await api.functional.shoppingMall.seller.seller_approval_requests.at(
      sellerConnection,
      {
        sellerApprovalRequestId,
      },
    );
  typia.assert(reread);
  TestValidator.equals("side effect free id", reread.id, detail.id);
  TestValidator.equals("side effect free status", reread.status, detail.status);
  TestValidator.equals("side effect free reason", reread.reason, detail.reason);
  TestValidator.equals(
    "side effect free reviewed timestamp",
    reread.reviewed_at,
    detail.reviewed_at,
  );
  TestValidator.equals(
    "side effect free created timestamp",
    reread.created_at,
    detail.created_at,
  );
  TestValidator.equals(
    "side effect free updated timestamp",
    reread.updated_at,
    detail.updated_at,
  );
  TestValidator.equals(
    "side effect free deleted timestamp",
    reread.deleted_at,
    detail.deleted_at,
  );
  TestValidator.equals("side effect free seller", reread.seller, detail.seller);
  TestValidator.equals(
    "side effect free reviewer",
    reread.reviewer,
    detail.reviewer,
  );
  TestValidator.equals("reread still has no reviewer", reread.reviewer, null);
  TestValidator.equals(
    "reread still has no reviewed timestamp",
    reread.reviewed_at,
    null,
  );
  TestValidator.equals(
    "seller approval status still pending after read",
    detail.seller.approval_status,
    "pending",
  );
}
