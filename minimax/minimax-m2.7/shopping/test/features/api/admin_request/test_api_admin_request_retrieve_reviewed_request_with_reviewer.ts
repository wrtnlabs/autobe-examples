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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_retrieve_reviewed_request_with_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a seller account to submit admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Submit an admin request as the seller
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      sellerConnection,
      {
        body: {
          actorType: "seller" as const,
          requestedGrade: "admin" as const,
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequest);
  // 4. Approve the admin request using the super admin connection
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Retrieve the reviewed request details
  const reviewedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.at(
      superAdminConnection,
      {
        requestId: approvedRequest.id,
      },
    );
  typia.assert(reviewedRequest);
  // 6. Validate the reviewed request includes reviewer information
  TestValidator.equals(
    "status is approved",
    reviewedRequest.status,
    "approved",
  );
  TestValidator.notEquals("reviewer exists", reviewedRequest.reviewer, null);
  // Validate reviewer is a valid IEcommerceMallSuperAdmin.ISummary object
  const reviewer = reviewedRequest.reviewer!;
  TestValidator.notEquals("reviewer id exists", reviewer.id, null);
  TestValidator.notEquals("reviewer email exists", reviewer.email, null);
  TestValidator.notEquals(
    "reviewer createdAt exists",
    reviewer.createdAt,
    null,
  );
  TestValidator.notEquals(
    "reviewer updatedAt exists",
    reviewer.updatedAt,
    null,
  );
  // Validate review timestamp - updatedAt should reflect the review action
  TestValidator.equals(
    "updatedAt matches review time",
    reviewedRequest.updatedAt,
    approvedRequest.updatedAt,
  );
  // Validate reviewer is the super admin who approved
  TestValidator.equals(
    "reviewer is approving super admin",
    reviewer.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "reviewer email matches",
    reviewer.email,
    superAdmin.email,
  );
}
