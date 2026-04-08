import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_current_state_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test current-state retrieval of a seller approval request.
   *
   * Verifies that an authenticated seller can call the approval-request detail
   * endpoint and receive a valid administrator approval request DTO.
   *
   * 1. Register a seller account with a dedicated authenticated connection.
   * 2. Retrieve an approval request record by UUID through the seller endpoint.
   * 3. Validate the response DTO shape and preserve current persisted state fields.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const request = await api.functional.mallPlatform.seller.approvalRequests.at(
    sellerConnection,
    {
      approvalRequestId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(request);
  TestValidator.predicate("approval request has an id", request.id.length > 0);
  TestValidator.predicate(
    "approval request has an applicant administrator summary",
    request.administrator.id.length > 0 &&
      request.administrator.email.length > 0,
  );
  TestValidator.predicate(
    "approval request has a non-empty reason",
    request.reason.length > 0,
  );
  TestValidator.predicate(
    "approval request has a lifecycle status",
    request.status.length > 0,
  );
  if (request.status === "pending") {
    TestValidator.equals(
      "pending request reviewer administrator",
      request.reviewerAdministrator,
      null,
    );
    TestValidator.equals(
      "pending request rejection reason",
      request.rejectionReason,
      null,
    );
    TestValidator.equals(
      "pending request reviewedAt",
      request.reviewedAt,
      null,
    );
  } else {
    TestValidator.predicate(
      "reviewed requests include reviewer administrator or rejection details",
      request.reviewerAdministrator !== null ||
        request.rejectionReason !== null ||
        request.reviewedAt !== null,
    );
  }
  TestValidator.predicate(
    "approval request has createdAt",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "approval request has updatedAt",
    request.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "approval request deletedAt is nullable",
    request.deletedAt === null || request.deletedAt.length > 0,
  );
}
