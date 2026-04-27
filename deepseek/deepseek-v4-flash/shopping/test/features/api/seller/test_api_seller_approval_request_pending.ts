import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_pending(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Register a new seller (creates approval request in pending status)
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  TestValidator.equals(
    "seller approval status is pending",
    authorized.approval_status,
    "pending",
  );
  //----
  // Retrieve approval request
  // The join response contains the seller's id. The approval request references
  // the seller by their id, but the approval request id is different from seller id.
  // After joining, the seller can retrieve their approval request via the at endpoint.
  //----
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.at(
      sellerConnection,
      { requestId: authorized.id },
    );
  typia.assert(approvalRequest);
  //----
  // Validate pending status
  //----
  TestValidator.equals("request id matches", approvalRequest.id, authorized.id);
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  TestValidator.equals(
    "seller id matches",
    approvalRequest.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvalRequest.seller.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller approval status matches",
    approvalRequest.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller shop name matches",
    approvalRequest.seller.profile.shop_name,
    authorized.profile!.shopName,
  );
  TestValidator.predicate(
    "rejection reason is null",
    approvalRequest.rejection_reason === null,
  );
  TestValidator.predicate(
    "reviewer is null",
    approvalRequest.reviewer === null,
  );
  TestValidator.predicate(
    "reviewed at is null",
    approvalRequest.reviewed_at === null,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date",
    typeof approvalRequest.created_at === "string",
  );
}
