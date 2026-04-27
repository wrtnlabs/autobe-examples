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

export async function test_api_administrator_approval_request_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  //----
  // STEP 1: CREATE ACTOR-SPECIFIC CONNECTIONS
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  //----
  // STEP 2: REGISTER AND AUTHENTICATE ADMINISTRATOR
  //----
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  //----
  // STEP 3: REGISTER AND AUTHENTICATE SELLER
  // Creates seller with approval_status='pending' and an implicit approval request
  //----
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  //----
  // STEP 4: ADMIN REJECTS THE APPROVAL REQUEST
  //----
  const rejectionReason =
    "Your business registration information is incomplete. " +
    "Please provide additional details about your product catalog " +
    "and pricing strategy before resubmitting.";
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const rejectedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId,
        body: {
          status: "rejected" as const,
          rejection_reason: rejectionReason,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  //----
  // STEP 5: ADMIN RETRIEVES THE REJECTED APPROVAL REQUEST
  //----
  const retrievedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.at(
      adminConnection,
      {
        requestId: rejectedRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  //----
  // STEP 6: VALIDATE THE REJECTED APPROVAL REQUEST
  //----
  // Status business value must be "rejected"
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  // rejection_reason must be a non-empty string (business rule)
  TestValidator.predicate(
    "rejection_reason is a non-empty string",
    () =>
      retrievedRequest.rejection_reason !== null &&
      retrievedRequest.rejection_reason!.length > 0,
  );
  // seller's approval_status must be "rejected" (business rule)
  TestValidator.equals(
    "seller approval_status is rejected",
    retrievedRequest.seller.approval_status,
    "rejected",
  );
  // updated_at should be later than created_at (review happened after creation)
  TestValidator.predicate(
    "updated_at is later than created_at",
    () =>
      new Date(retrievedRequest.updated_at).getTime() >
      new Date(retrievedRequest.created_at).getTime(),
  );
}
