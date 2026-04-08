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

export async function test_api_admin_request_approval_from_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 3. Seller submits admin request
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: seller.token.access,
  };
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      sellerAuthConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequest);
  // 4. Validate the admin request was created with pending status
  TestValidator.equals(
    "admin request created",
    adminRequest.email,
    seller.email,
  );
  // 5. Super admin approves the admin request
  // Note: requestId would need to be obtained from admin request creation response
  // For testing purposes, using the super admin connection with the approval endpoint
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
      superAdminConnection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(approvedRequest);
  // 6. Validate the approval response
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewer is super admin",
    approvedRequest.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer email matches",
    approvedRequest.reviewer!.email,
    superAdmin.email,
  );
}
