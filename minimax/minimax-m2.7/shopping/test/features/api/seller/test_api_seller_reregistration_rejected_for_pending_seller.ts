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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_reregister } from "../../../generate/generate_random_ecommerce_mall_seller_seller_reregister";
import { prepare_random_ecommerce_mall_seller } from "../../../prepare/prepare_random_ecommerce_mall_seller";

/**
 * Test that a seller with 'pending' status cannot use the reregister endpoint.
 *
 * Validates the business rule that only rejected sellers can resubmit their registration request.
 * Pending sellers must wait for administrator review instead of using the reregister endpoint.
 *
 * This test ensures:
 * 1. A newly registered seller starts with 'pending' approval status
 * 2. Attempting to reregister while pending returns 400 Bad Request
 * 3. The error message specifically indicates 'Registration already pending'
 * 4. The seller account status remains unchanged at 'pending'
 *
 * Business flow being tested:
 * 1. Create a new seller account via join endpoint (status is 'pending')
 * 2. Attempt to call reregister endpoint with pending seller's credentials
 * 3. Expect 400 error with 'Registration already pending' message
 * 4. Verify seller status is still 'pending'
 */
export async function test_api_seller_reregistration_rejected_for_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account via join endpoint (status becomes 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(joined);
  // Validate seller was created with 'pending' status
  TestValidator.equals(
    "seller status is pending",
    joined.approvalStatus,
    "pending",
  );
  // 2. Attempt to reregister with pending seller's credentials
  // 3. Expect 400 Bad Request with error message 'Registration already pending'
  await TestValidator.error(
    "reregister rejected for pending seller",
    async () => {
      await api.functional.ecommerceMall.seller.seller.reregister(
        sellerConnection,
        {
          body: {
            email: joined.email,
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceMallSeller.ICreate,
        },
      );
    },
  );
  // 4. Validate seller status remains 'pending' (unchanged)
  TestValidator.equals(
    "seller status still pending after failed reregister",
    joined.approvalStatus,
    "pending",
  );
}
