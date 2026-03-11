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

export async function test_api_seller_email_verification_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple seller accounts to generate email verification records
  const sellers: IEcommerceMallSeller.IAuthorized[] = [];
  // Register first seller with pending email verification
  {
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
    sellers.push(seller);
  }
  // Register second seller with pending email verification
  {
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
    sellers.push(seller);
  }
  // 2. Query email verifications with status='pending' filter
  const adminConnection: api.IConnection = { host: connection.host };
  const pendingFilter = {
    status: "pending",
  } satisfies IEcommerceMallSellerEmailVerification.IRequest;
  const pendingResult =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // Verify all returned records have status='pending'
  pendingResult.data.forEach((record) => {
    TestValidator.equals(
      "pending filter returns only pending records",
      record.status,
      "pending",
    );
  });
  // 3. Test combined filter: status='pending' with entity_type='seller'
  const combinedFilter = {
    status: "pending",
    entity_type: "seller",
  } satisfies IEcommerceMallSellerEmailVerification.IRequest;
  const combinedResult =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Verify all records match both criteria
  combinedResult.data.forEach((record) => {
    TestValidator.equals(
      "combined filter returns pending seller verifications",
      record.status,
      "pending",
    );
    TestValidator.equals(
      "combined filter seller entity type matches",
      record.seller.approvalStatus,
      "pending",
    );
  });
  // 4. Verify pagination is correctly populated
  TestValidator.equals(
    "pending filter pagination has valid records count",
    pendingResult.pagination.records,
    pendingResult.pagination.records,
  );
  TestValidator.equals(
    "combined filter pagination has valid records count",
    combinedResult.pagination.records,
    combinedResult.pagination.records,
  );
  // 5. Query with no filter to verify baseline (all records)
  const noFilter = {} satisfies IEcommerceMallSellerEmailVerification.IRequest;
  const allResult =
    await api.functional.ecommerceMall.seller.email_verifications.index(
      adminConnection,
      { body: noFilter },
    );
  typia.assert(allResult);
  // Verify that filtered results are subsets of all records
  TestValidator.predicate(
    "pending count should be <= total count",
    () => pendingResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "combined count should be <= total count",
    () => combinedResult.pagination.records <= allResult.pagination.records,
  );
}
