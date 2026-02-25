import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_seller_approval_responses_create } from "../../../generate/generate_random_ecommerce_administrator_seller_approval_responses_create";
import { prepare_random_ecommerce_seller_approval_response } from "../../../prepare/prepare_random_ecommerce_seller_approval_response";

export async function test_api_seller_approval_response_retrieve_rejected_decision(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a seller approval response with rejected decision
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const sellerApprovalQueueId = typia.random<string & tags.Format<"uuid">>();
  const rejectedResponse =
    await generate_random_ecommerce_administrator_seller_approval_responses_create(
      adminConnection,
      {
        body: {
          decision: "rejected" as const,
          reason: rejectionReason,
          seller_approval_queue_id: sellerApprovalQueueId,
        } satisfies IEcommerceSellerApprovalResponse.ICreate,
      },
    );
  typia.assert(rejectedResponse);
  // Retrieve the rejected decision
  const retrievedResponse =
    await api.functional.ecommerce.administrator.seller_approval_responses.at(
      adminConnection,
      {
        sellerApprovalResponseId: rejectedResponse.id,
      },
    );
  typia.assert(retrievedResponse);
  // Validate rejected decision details
  TestValidator.equals(
    "decision should be rejected",
    retrievedResponse.decision,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason should match",
    retrievedResponse.reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "responded_at should be valid timestamp",
    retrievedResponse.responded_at !== null,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    retrievedResponse.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    retrievedResponse.updated_at !== null,
  );
  TestValidator.equals(
    "IDs should match",
    retrievedResponse.id,
    rejectedResponse.id,
  );
  // Validate audit trail relationships
  TestValidator.predicate(
    "seller approval queue reference should exist",
    retrievedResponse.sellerApprovalQueue !== null,
  );
  TestValidator.equals(
    "seller approval queue ID should match",
    retrievedResponse.sellerApprovalQueue.id,
    sellerApprovalQueueId,
  );
  TestValidator.predicate(
    "administrator reference should exist",
    retrievedResponse.administrator !== null,
  );
  TestValidator.equals(
    "administrator ID should match initiator",
    retrievedResponse.administrator.id,
    adminAuth.id,
  );
}
