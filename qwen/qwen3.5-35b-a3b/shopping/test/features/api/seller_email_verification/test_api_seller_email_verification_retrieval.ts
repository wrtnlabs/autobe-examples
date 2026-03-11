import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can successfully retrieve their own email verification records.
 * First, register a new seller account which creates a pending email verification token.
 * Then query the email verification endpoint to retrieve the seller's verification record.
 * Verify the response includes the correct seller_id, status 'pending', expiration timestamp,
 * and pagination metadata. Test pagination by requesting with different page/limit parameters
 * and verify the response correctly returns records matching the criteria.
 */
export async function test_api_seller_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Query email verifications with page=1, limit=10
  const emailVerifications1: IPageIEcommerceMallSellerEmailVerification.ISummary =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      sellerConnection,
      {
        body: {
          seller_id: seller.id,
          page: "1",
          limit: 10,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(emailVerifications1);
  // 3. Validate response structure
  TestValidator.equals(
    "verification record exists",
    emailVerifications1.data.length,
    1,
  );
  TestValidator.equals(
    "seller_id matches registered seller",
    emailVerifications1.data[0].seller.id,
    seller.id,
  );
  TestValidator.equals(
    "verification status is pending",
    emailVerifications1.data[0].status,
    "pending",
  );
  TestValidator.predicate(
    "has valid expiration timestamp",
    () => new Date(emailVerifications1.data[0].expiresAt) > new Date(),
  );
  TestValidator.equals(
    "pagination current page is 1",
    emailVerifications1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    emailVerifications1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records total",
    emailVerifications1.pagination.records,
    1,
  );
  // 4. Test pagination with different parameters (page=2, limit=5)
  const emailVerifications2: IPageIEcommerceMallSellerEmailVerification.ISummary =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      sellerConnection,
      {
        body: {
          seller_id: seller.id,
          page: "2",
          limit: 5,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(emailVerifications2);
  TestValidator.equals(
    "pagination second page current is 2",
    emailVerifications2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination second page limit is 5",
    emailVerifications2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records unchanged",
    emailVerifications2.pagination.records,
    emailVerifications1.pagination.records,
  );
  TestValidator.equals(
    "pagination second page data empty",
    emailVerifications2.data.length,
    0,
  );
}
