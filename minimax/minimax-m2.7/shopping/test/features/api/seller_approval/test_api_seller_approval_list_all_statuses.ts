import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_approval_list_all_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via admin request
  const adminPassword = "AdminPass123!";
  const adminJoinResult =
    await api.functional.ecommerceMall.auth.admin.request.join(connection, {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com/admin",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(adminJoinResult);
  // 2. Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Call seller approvals list without status filter
  const approvalsResponse =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    approvalsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(approvalsResponse.data),
    true,
  );
  // 5. Validate data structure if records exist
  if (approvalsResponse.data.length > 0) {
    const firstApproval = approvalsResponse.data[0];
    TestValidator.equals("has id", typeof firstApproval.id === "string", true);
    TestValidator.equals(
      "has valid status",
      ["pending", "approved", "rejected"].includes(firstApproval.status),
      true,
    );
    TestValidator.equals(
      "has seller info",
      firstApproval.seller !== null,
      true,
    );
    TestValidator.equals(
      "seller has id",
      typeof firstApproval.seller.id === "string",
      true,
    );
    TestValidator.equals(
      "seller has email",
      typeof firstApproval.seller.email === "string",
      true,
    );
    TestValidator.equals(
      "seller has approvalStatus",
      typeof firstApproval.seller.approvalStatus === "string",
      true,
    );
    TestValidator.equals(
      "seller has createdAt",
      typeof firstApproval.seller.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "has createdAt",
      typeof firstApproval.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "has updatedAt",
      typeof firstApproval.updatedAt === "string",
      true,
    );
  }
}