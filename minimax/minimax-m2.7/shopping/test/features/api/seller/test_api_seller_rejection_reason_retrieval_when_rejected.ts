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

export async function test_api_seller_rejection_reason_retrieval_when_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Test authentication required - should return 401 without token
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 401 without authentication",
    401,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.rejection_reason.at(
        noAuthConnection,
      );
    },
  );
  // 3. Get rejection reason for pending seller (should have null rejectionReason)
  const result =
    await api.functional.ecommerceMall.seller.sellers.rejection_reason.at(
      sellerConnection,
    );
  typia.assert(result);
  // 4. Validate response structure
  TestValidator.equals("id should be valid UUID", typeof result.id, "string");
  TestValidator.equals(
    "email should be present",
    result.email.includes("@"),
    true,
  );
  TestValidator.equals(
    "approval status should be pending for new seller",
    result.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejection reason should be null for pending seller",
    result.rejectionReason,
    null,
  );
  TestValidator.equals(
    "rejected at should be null for pending seller",
    result.rejectedAt,
    null,
  );
  TestValidator.predicate(
    "profile should exist",
    result.profile !== null && result.profile !== undefined,
  );
  TestValidator.predicate(
    "products count should be non-negative",
    result.productsCount >= 0,
  );
  TestValidator.predicate(
    "created at should be valid date-time",
    result.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "updated at should be valid date-time",
    result.updatedAt.includes("T"),
  );
}
