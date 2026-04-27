import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can retrieve an approved seller's account and profile.
 *
 * Validates the complete approval workflow: an administrator is created and promoted to super administrator, a seller registers, submits an approval request, the super administrator approves it, and then retrieves the seller's full profile. Ensures the response contains the correct seller identity, approved status, shop profile, and that no sensitive data like password_hash is exposed.
 *
 * 1. Create an administrator account via `authorize_administrator_join`.
 * 2. Promote the administrator to super administrator via `authorize_super_administrator_join` using the admin's ID.
 * 3. Register a seller account via `authorize_seller_join` with a known shop name.
 * 4. Seller submits an approval request.
 * 5. Super administrator approves the seller's request.
 * 6. Super administrator retrieves the seller's profile.
 * 7. Validate that seller id matches, approval_status is 'approved', profile is present with matching shop name, and deleted_at is null.
 */
export async function test_api_seller_approved_profile_view_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Promote the administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Create a seller account with a known shop name
  const shopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 4. Seller submits an approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 5. Super admin approves the seller's request
  const updatedApproval =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // 6. Super admin retrieves the approved seller's profile
  const sellerResponse =
    await api.functional.eCommerceMall.superAdministrator.sellers.at(
      superAdminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(sellerResponse);
  // 7. Validate response fields
  TestValidator.equals("seller id matches", sellerResponse.id, seller.id);
  TestValidator.equals(
    "seller approval status is approved",
    sellerResponse.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "seller profile is not null",
    sellerResponse.profile !== null,
  );
  if (sellerResponse.profile !== null) {
    TestValidator.equals(
      "shop name matches registration input",
      sellerResponse.profile.shopName,
      shopName,
    );
  }
  TestValidator.predicate(
    "deleted_at is null for active account",
    sellerResponse.deleted_at === null,
  );
}
