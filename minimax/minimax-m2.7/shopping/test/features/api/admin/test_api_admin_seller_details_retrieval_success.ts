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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

/**
 * Test admin can retrieve seller details successfully.
 *
 * Scenario:
 * 1. Admin registers and authenticates using POST /ecommerceMall/auth/admin/join
 * 2. Seller registers using POST /ecommerceMall/auth/seller/join
 * 3. Admin approves seller registration using POST /ecommerceMall/admin/seller-approvals
 * 4. Admin retrieves seller details using GET /ecommerceMall/admin/sellers/{sellerId}
 * 5. Validate response contains: id, created_at, approval_status, profile (name, description, logo_uri)
 */
export async function test_api_admin_seller_details_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Admin approves seller registration
  const approval =
    await generate_random_ecommerce_mall_admin_seller_approvals_create(
      adminConnection,
      {
        body: {
          sellerId: seller.id,
          status: "approved" as const,
        },
      },
    );
  typia.assert(approval);
  // 4. Admin retrieves seller details
  const sellerDetails = await api.functional.ecommerceMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(sellerDetails);
  // 5. Validate response structure matches IEcommerceMallSeller.IInvert
  TestValidator.equals("seller id matches", sellerDetails.id, seller.id);
  TestValidator.predicate(
    "has valid created_at",
    sellerDetails.created_at !== undefined &&
      sellerDetails.created_at.length > 0,
  );
  TestValidator.equals(
    "approval_status is approved",
    sellerDetails.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "has profile object",
    sellerDetails.profile !== undefined,
  );
  TestValidator.predicate(
    "profile has name",
    sellerDetails.profile.name !== undefined &&
      sellerDetails.profile.name.length > 0,
  );
  TestValidator.predicate(
    "profile has description",
    sellerDetails.profile.description !== undefined,
  );
  TestValidator.predicate(
    "profile has logo_uri (nullable)",
    sellerDetails.profile.logo_uri === null ||
      typeof sellerDetails.profile.logo_uri === "string",
  );
}
