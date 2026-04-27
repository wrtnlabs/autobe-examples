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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_resubmission_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Prepare seller credentials for reuse
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  // 1. Join as a new seller (auto-generates initial approval request)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Join as a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 3. Administrator rejects the seller's initial (auto-generated) approval request.
  // The auto-generated approval request is created upon seller registration.
  // The request ID is available from the seller join response in the production setup.
  const rejectionReason: string = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: seller.id,
        body: {
          status: "rejected" as const,
          rejection_reason: rejectionReason,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // Verify the rejection outcome
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason set",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is set after rejection",
    rejectedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer is set after rejection",
    rejectedRequest.reviewer !== null,
  );
  // 4. Re-authenticate as seller with a fresh connection for actor switching
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 5. Seller submits a new approval request after being rejected
  const newRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerLoginConnection,
    );
  typia.assert(newRequest);
  // 6. Validate the new approval request fields
  TestValidator.equals(
    "new request status is pending",
    newRequest.status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason is null for new request",
    newRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewer is null for new request",
    newRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for new request",
    newRequest.reviewed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is a valid date-time string",
    typeof newRequest.created_at === "string",
  );
  TestValidator.equals(
    "seller.id matches the authenticated seller",
    newRequest.seller.id,
    seller.id,
  );
  TestValidator.predicate(
    "new request has a different id from the rejected request",
    newRequest.id !== rejectedRequest.id,
  );
}
