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

export async function test_api_seller_email_verification_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Query email verification records for seller entity type
  // This should return the seller's own email verification record
  const sellerRecords =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      sellerConnection,
      {
        body: {
          entity_type: "seller",
          seller_id: seller.id,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(sellerRecords);
  // Verify that seller has at least one email verification record
  TestValidator.equals(
    "seller should have email verification record",
    sellerRecords.data.length,
    1,
  );
  // 3. Query email verification records for admin entity type
  // Seller should NOT see any admin email verification records (data isolation)
  const adminRecords =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      sellerConnection,
      {
        body: {
          entity_type: "admin",
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(adminRecords);
  // Verify that seller cannot access admin records
  TestValidator.equals(
    "seller should not see admin email verification records",
    adminRecords.data.length,
    0,
  );
  // 4. Query email verification records for customer entity type
  // Seller should NOT see any customer email verification records (data isolation)
  const customerRecords =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      sellerConnection,
      {
        body: {
          entity_type: "customer",
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(customerRecords);
  // Verify that seller cannot access customer records
  TestValidator.equals(
    "seller should not see customer email verification records",
    customerRecords.data.length,
    0,
  );
}