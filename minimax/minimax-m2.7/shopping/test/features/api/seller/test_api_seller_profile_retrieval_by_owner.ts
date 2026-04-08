import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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

/**
 * Test that an approved seller can successfully retrieve their own shop profile.
 *
 * Validates the complete workflow where a newly registered seller first gets approved
 * by an administrator and then can retrieve their shop profile. The test ensures that
 * the seller profile endpoint returns complete profile information including the shop
 * name, description, logo URI, seller reference, and timestamps.
 *
 * The test flow involves:
 * 1. Admin registers and authenticates to approve sellers
 * 2. Seller registers and gets approved by admin
 * 3. Seller authenticates after approval
 * 4. Seller retrieves their own profile via GET /seller/sellers/me/profile
 * 5. Validates response contains all required fields with proper types
 *
 * This is a primary success path test validating that approved sellers have proper
 * access to their shop profile data.
 */
export async function test_api_seller_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration - Register new seller with stored credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: sellerHref,
    referrer: sellerReferrer,
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerJoinBody,
    },
  );
  // 3. Admin approves the seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Seller authenticates after approval using stored credentials
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    },
  });
  // 5. Retrieve seller's own profile
  const profile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.at(
      approvedSellerConnection,
    );
  typia.assert(profile);
  // 6. Validate business logic - seller email matches authenticated seller
  TestValidator.equals(
    "seller email matches authenticated seller",
    profile.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "profile id is valid UUID",
    profile.seller.id,
    sellerAuth.id,
  );
}
