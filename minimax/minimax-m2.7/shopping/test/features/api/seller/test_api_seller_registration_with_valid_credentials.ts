import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid seller registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register seller via utility function (handles POST /ecommerceMall/auth/seller/join)
  const seller = await authorize_seller_join(connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Validate complete response structure with typia.assert
  typia.assert(seller);
  // 4. Validate business logic assertions
  // Approval status must be pending for new registration
  TestValidator.equals(
    "approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // Tokens must be present and non-empty
  TestValidator.predicate(
    "access token exists",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    seller.token.refresh.length > 0,
  );
  // Seller identity matches input
  TestValidator.equals("email matches input", seller.email, email);
  TestValidator.predicate(
    "seller id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(seller.id),
  );
  // Profile must be included
  TestValidator.predicate("profile exists", !!seller.profile);
  TestValidator.equals(
    "profile seller email matches",
    seller.profile.seller.email,
    email,
  );
  // New seller has zero products
  TestValidator.equals("products count is zero", seller.productsCount, 0);
  // Rejection fields must be null for new seller
  TestValidator.equals(
    "rejection reason is null",
    seller.rejectionReason,
    null,
  );
  TestValidator.equals("rejected at is null", seller.rejectedAt, null);
  TestValidator.equals("deleted at is null", seller.deletedAt, null);
  // 5. Validate token expiration timestamps
  const now = new Date();
  const expiredAt = new Date(seller.token.expired_at);
  const refreshableUntil = new Date(seller.token.refreshable_until);
  TestValidator.predicate("token expiration is in future", expiredAt > now);
  TestValidator.predicate(
    "refresh expiration is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh expiration after access expiration",
    refreshableUntil > expiredAt,
  );
}
