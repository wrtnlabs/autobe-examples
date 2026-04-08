import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_detail_reviewed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via admin request
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Test admin account for seller approval testing",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create seller account to generate seller approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Authenticate as admin to access approval endpoints
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEcommerceMallAdmin.ILogin = {
    email: adminAuthorized.email,
    password: "TestPassword123!",
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  };
  await authorize_admin_login(loggedInAdminConnection, {
    body: adminCredentials,
  });
  // 4. Approve the seller request
  const approvedApproval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      loggedInAdminConnection,
      {
        approvalId: sellerAuthorized.profile.seller.id as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(approvedApproval);
  // 5. Retrieve seller approval details using GET /ecommerceMall/admin/admin/seller-approvals/{approvalId}
  const approvalDetail =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.at(
      loggedInAdminConnection,
      {
        approvalId: sellerAuthorized.profile.seller.id as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(approvalDetail);
  // Validation Points:
  TestValidator.equals(
    "approval status should be approved",
    approvalDetail.status,
    "approved",
  );
  TestValidator.equals(
    "seller should be populated",
    approvalDetail.seller.id,
    sellerAuthorized.profile.seller.id,
  );
  TestValidator.notEquals(
    "reviewedByAdmin should be populated",
    approvalDetail.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "rejectionReason should be null for approved",
    approvalDetail.rejectionReason ?? null,
    null,
  );
  TestValidator.predicate(
    "createdAt should be present",
    !!approvalDetail.createdAt,
  );
  TestValidator.predicate(
    "updatedAt should be present",
    !!approvalDetail.updatedAt,
  );
}
