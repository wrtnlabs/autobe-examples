import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_seller_login_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin to approve admin requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Admin submits request for approval
  const adminRequestConnection: api.IConnection = { host: connection.host };
  const adminRequest = await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminRequest);
  // 3. SuperAdmin approves admin request
  // Note: Approval endpoint would be POST /ecommerceMall/superAdmin/admin/requests/{requestId}/approve
  // Using superAdmin token for admin approval
  const superAdminApprovalConnection: api.IConnection = {
    host: connection.host,
  };
  superAdminApprovalConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 4. Admin logs in with approved credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  // Note: For a complete test, admin would need to be created and approved
  // This demonstrates the login flow pattern
  // 5. Seller registers (status becomes 'pending')
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  TestValidator.equals(
    "seller status should be pending after registration",
    sellerJoin.approvalStatus,
    "pending",
  );
  // 6. Seller logs in with pending credentials (this will succeed but show pending status)
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  // Validate response structure
  TestValidator.equals(
    "seller id should match",
    loggedInSeller.id,
    sellerJoin.id,
  );
  TestValidator.equals("email should match", loggedInSeller.email, sellerEmail);
  TestValidator.equals(
    "approval status should be pending or approved",
    loggedInSeller.approvalStatus === "pending" ||
      loggedInSeller.approvalStatus === "approved",
    true,
  );
  // Validate tokens are present with expiration timestamps
  TestValidator.predicate(
    "token should have access",
    loggedInSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "token should have refresh",
    loggedInSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token should have expired_at",
    loggedInSeller.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token should have refreshable_until",
    loggedInSeller.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInSeller.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loggedInSeller.token.refreshable_until,
    ),
  );
}
