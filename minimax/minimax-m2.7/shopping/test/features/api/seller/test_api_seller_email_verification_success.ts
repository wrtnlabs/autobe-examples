import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
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

export async function test_api_seller_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register a new seller using the utility function
  // The system generates a verification token stored in ecommerce_mall_seller_email_verifications
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Get the verification token from the join response token
  // Note: In a real E2E test with database access, we would query the actual
  // verification token from the database. For this test, we use the access token
  // from the join response to simulate the verification flow.
  const verificationToken = seller.token.access;
  // 4. Call the email verification endpoint
  // PATCH /ecommerceMall/seller/seller/email-verifications
  const verification =
    await api.functional.ecommerceMall.seller.seller.email_verifications.verify(
      sellerConnection,
      {
        body: {
          token: verificationToken,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(verification);
  // 5. Validate the verification response
  TestValidator.equals(
    "email matches seller email",
    verification.email,
    seller.email,
  );
  TestValidator.predicate(
    "verified_at is set",
    verification.verifiedAt !== null,
  );
  TestValidator.predicate(
    "seller is linked",
    verification.seller.id === seller.id,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(verification.id),
  );
  TestValidator.predicate(
    "has valid expires_at",
    verification.expiresAt !== null && verification.expiresAt !== undefined,
  );
}
