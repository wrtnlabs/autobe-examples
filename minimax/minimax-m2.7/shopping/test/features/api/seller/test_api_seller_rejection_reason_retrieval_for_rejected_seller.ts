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

export async function test_api_seller_rejection_reason_retrieval_for_rejected_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for rejecting sellers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a seller that will be rejected
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Define rejection reason
  const rejectionText = RandomGenerator.paragraph({ sentences: 2 });
  // 4. Admin rejects the seller
  const rejectedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.reject(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          rejectionReason: rejectionText,
        } satisfies IEcommerceMallSeller.IUpdate,
      },
    );
  typia.assert(rejectedSeller);
  // 5. Verify seller status is rejected
  TestValidator.equals(
    "approval status is rejected",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedSeller.rejectionReason,
    rejectionText,
  );
  // 6. Seller retrieves rejection reason
  const rejectionReason =
    await api.functional.ecommerceMall.seller.seller.rejection_reason.rejectionReason(
      sellerConnection,
    );
  typia.assert(rejectionReason);
  // 7. Validate rejection reason response
  TestValidator.notEquals(
    "rejection reason is not null",
    rejectionReason.rejectionReason,
    null,
  );
  TestValidator.notEquals(
    "rejectedAt is not null",
    rejectionReason.rejectedAt,
    null,
  );
  // 8. Validate content matches
  TestValidator.equals(
    "rejection reason text matches",
    rejectionReason.rejectionReason,
    rejectionText,
  );
  // 9. Validate rejectedAt is valid ISO 8601 format
  TestValidator.predicate("rejectedAt is ISO 8601 format", () => {
    if (!rejectionReason.rejectedAt) return false;
    const date = new Date(rejectionReason.rejectedAt);
    return !isNaN(date.getTime());
  });
  // 10. Validate rejectedAt is recent (within expected range)
  TestValidator.predicate("rejectedAt is recent", () => {
    if (!rejectionReason.rejectedAt) return false;
    const rejectedAt = new Date(rejectionReason.rejectedAt);
    const now = new Date();
    const diffMs = now.getTime() - rejectedAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes <= 5;
  });
}
