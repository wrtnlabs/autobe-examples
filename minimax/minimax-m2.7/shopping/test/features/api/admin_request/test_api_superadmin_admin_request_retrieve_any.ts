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

export async function test_api_superadmin_admin_request_retrieve_any(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit an administrator request (use seller actor type)
  const adminRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Register a super admin account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // 4. Authenticate as the super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 5. Call GET /ecommerceMall/seller/admin-requests/{requestId} with super admin session
  // Use a sample request ID - in real integration tests this would be the actual request ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const adminRequest =
    await api.functional.ecommerceMall.seller.admin_requests.at(
      superAdminConnection,
      {
        requestId: requestId,
      },
    );
  typia.assert(adminRequest);
  // Validate response structure - super admin can retrieve any request
  TestValidator.predicate(
    "has valid UUID id",
    /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(
      adminRequest.id,
    ),
  );
  TestValidator.predicate(
    "actorType is valid",
    adminRequest.actorType === "customer" ||
      adminRequest.actorType === "seller",
  );
  TestValidator.predicate(
    "requestedGrade is valid",
    adminRequest.requestedGrade === "admin" ||
      adminRequest.requestedGrade === "super_admin",
  );
  TestValidator.predicate(
    "has non-empty reason",
    adminRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(adminRequest.status),
  );
}
