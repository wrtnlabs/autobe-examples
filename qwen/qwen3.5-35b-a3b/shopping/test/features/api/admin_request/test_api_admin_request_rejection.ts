import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri"> & tags.MaxLength<255>,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri"> & tags.MaxLength<255>,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string & tags.Format<"ipv4">,
    },
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri"> & tags.MaxLength<255>,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri"> & tags.MaxLength<255>,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string & tags.Format<"ipv4">,
    },
  });
  // 3. Customer submits admin request
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: "Need administrative access for system maintenance",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. Verify initial status is pending
  TestValidator.equals(
    "initial request status should be pending",
    adminRequest.request_status,
    "pending",
  );
  // 5. Admin reviews and rejects the request
  const reviewInput = {
    action: "reject" as const,
    rejection_reason: "Insufficient justification for admin access",
  } satisfies IEcommerceMallAdminRequestRequest.IReview;
  const reviewedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.review(
      adminConnection,
      {
        requestId: adminRequest.id,
        body: reviewInput,
      },
    );
  typia.assert(reviewedRequest);
  // 6. Validate request status changed to rejected
  TestValidator.equals(
    "request status should be rejected after review",
    reviewedRequest.request_status,
    "rejected",
  );
  // 7. Validate snapshot was created with rejection details
  TestValidator.equals(
    "request should have at least one snapshot",
    reviewedRequest.snapshots.length,
    1,
  );
  const snapshot = reviewedRequest.snapshots[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot reason should match original request",
    snapshot.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "snapshot request status should be rejected",
    snapshot.request_status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot changedBy should be non-null (super admin who rejected)",
    snapshot.changedBy !== null,
    true,
  );
  TestValidator.predicate(
    "snapshot changedAt should be a valid date-time",
    () => !isNaN(Date.parse(snapshot.changed_at)),
  );
  // 8. Verify original admin request details (should also show rejected status)
  TestValidator.equals(
    "original request status should be rejected",
    adminRequest.request_status,
    "rejected",
  );
  TestValidator.equals(
    "original request should have snapshots array",
    adminRequest.snapshots.length >= 1,
    true,
  );
}