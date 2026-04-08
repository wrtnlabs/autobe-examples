import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_approval_rejection_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: "SuperAdmin123!@#" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Create admin account (submit request + get credentials)
  const adminConnectionForJoin: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!@#";
  // Submit admin request and create admin account with credentials
  await authorize_admin_join(adminConnectionForJoin, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Login as admin using the credentials from join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
      href: "http://localhost:3000" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" as string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Attempt to reject a non-existent seller approval
  await TestValidator.httpError(
    "reject non-existent seller approval returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.admin.seller_approvals.reject(
        adminConnection,
        {
          approvalId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          body: {
            rejectionReason: "Test rejection reason for non-existent approval",
          } satisfies IEcommerceMallSellerApproval.IReject,
        },
      );
    },
  );
}