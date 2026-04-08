import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
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

/**
 * Test that an administrator can successfully review and approve a pending seller registration.
 */
export async function test_api_seller_registration_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create seller account (which creates a pending registration)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 3. Admin lists registrations to find the pending one
  const registrations: IPageIEcommerceMallSellerRegistration.ISummary =
    await api.functional.ecommerceMall.admin.registrations.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerId: seller.id,
        } satisfies IEcommerceMallSellerRegistration.IRequest,
      },
    );
  typia.assert(registrations);
  // Find the pending registration for our seller
  const pendingRegistration = registrations.data.find(
    (reg) => reg.seller.id === seller.id && reg.status === "pending",
  );
  TestValidator.predicate(
    "pending registration exists",
    pendingRegistration !== undefined,
  );
  // 4. Admin approves the registration
  const approvedRegistration: IEcommerceMallSellerRegistration =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId: pendingRegistration!.id,
        body: {
          status: "approved",
          rejectionReason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Verify the approval response
  TestValidator.equals(
    "status is approved",
    approvedRegistration.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer matches admin",
    approvedRegistration.reviewer?.id,
    admin.id,
  );
  TestValidator.equals(
    "reviewer email matches",
    approvedRegistration.reviewer?.email,
    admin.email,
  );
  TestValidator.predicate(
    "reviewedAt is set",
    approvedRegistration.reviewedAt !== null,
  );
  TestValidator.equals(
    "seller matches",
    approvedRegistration.seller.id,
    seller.id,
  );
}
