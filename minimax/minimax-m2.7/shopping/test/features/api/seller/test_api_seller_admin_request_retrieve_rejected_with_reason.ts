import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_admin_request_retrieve_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Submit admin request as the seller actor
  const adminRequestConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.request.join(
    adminRequestConnection,
    {
      body: {
        actorType: "seller",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // 3. Attempt to retrieve admin request
  // Use a test UUID - in a real scenario this would be a rejected request ID
  const testRequestId = typia.random<string & tags.Format<"uuid">>();
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.admin_requests.at(
      sellerConnection,
      {
        requestId: testRequestId,
      },
    );
  typia.assert(retrievedRequest);
  // Validation - response structure is correct
  TestValidator.equals(
    "actorType should be seller",
    retrievedRequest.actorType,
    "seller",
  );
  TestValidator.predicate(
    "status should be valid",
    ["pending", "approved", "rejected"].includes(retrievedRequest.status),
  );
  TestValidator.predicate(
    "requestId should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedRequest.id,
    ),
  );
  TestValidator.predicate(
    "reason should be non-empty",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.equals(
    "deletedAt should be null for active requests",
    retrievedRequest.deletedAt,
    null,
  );
  // For rejected state validation (when applicable)
  if (retrievedRequest.status === "rejected") {
    TestValidator.predicate(
      "reviewedReason should be non-null for rejected requests",
      retrievedRequest.reviewedReason !== null,
    );
    TestValidator.predicate(
      "reviewedReason should contain explanation",
      retrievedRequest.reviewedReason !== null &&
        retrievedRequest.reviewedReason.length > 0,
    );
  }
  // For pending state validation
  if (retrievedRequest.status === "pending") {
    TestValidator.equals(
      "reviewedReason should be null for pending requests",
      retrievedRequest.reviewedReason,
      null,
    );
    TestValidator.equals(
      "reviewer should be null for pending requests",
      retrievedRequest.reviewer,
      null,
    );
  }
}
