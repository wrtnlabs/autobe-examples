import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_email_verification_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register a new seller to establish authentication flow
  const adminConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() as string,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create seller-specific connection for authenticated operations
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: seller.token.access,
  };
  // 3. Generate a random verification ID for testing
  // Note: In production, this ID would come from the registration response or a list endpoint
  const verificationId: string = typia.random<string & tags.Format<"uuid">>() as string;
  // 4. Retrieve the email verification record
  const verification =
    await api.functional.ecommerceMall.seller.email_verifications.at(
      sellerConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 5. Validate response structure
  TestValidator.equals(
    "verification has valid id",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "customer id matches seller",
    verification.customerId,
    seller.id,
  );
  TestValidator.predicate(
    "token is present and non-empty",
    () => verification.token.length > 0,
  );
  TestValidator.predicate(
    "expires at is valid date-time",
    () => !isNaN(Date.parse(verification.expiresAt)),
  );
  TestValidator.predicate(
    "created at is valid date-time",
    () => !isNaN(Date.parse(verification.createdAt)),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    () => !isNaN(Date.parse(verification.updatedAt)),
  );
  TestValidator.predicate(
    "used at can be null or valid date-time",
    () =>
      verification.usedAt === null || !isNaN(Date.parse(verification.usedAt)),
  );
  TestValidator.predicate(
    "deleted at can be null or valid date-time",
    () =>
      verification.deletedAt === null ||
      !isNaN(Date.parse(verification.deletedAt)),
  );
}