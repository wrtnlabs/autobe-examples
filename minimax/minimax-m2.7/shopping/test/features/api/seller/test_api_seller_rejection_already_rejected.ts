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

export async function test_api_seller_rejection_already_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminJoin = await api.functional.ecommerceMall.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminJoin.token.access;
  // 2. Seller joins the platform (pending status)
  const sellerJoin = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoin);
  // 3. Admin rejects the pending seller (first rejection - should succeed)
  const originalReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRejection =
    await api.functional.ecommerceMall.admin.admin.sellers.reject(
      adminConnection,
      {
        sellerId: sellerJoin.id,
        body: {
          rejectionReason: originalReason,
        } satisfies IEcommerceMallSeller.IUpdate,
      },
    );
  typia.assert(firstRejection);
  // Validate first rejection succeeded
  TestValidator.equals(
    "approval status is rejected",
    firstRejection.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    firstRejection.rejectionReason,
    originalReason,
  );
  TestValidator.predicate(
    "rejected at is set",
    firstRejection.rejectedAt !== null,
  );
  // 4. Admin attempts to reject the already rejected seller (should fail with 400)
  await TestValidator.httpError(
    "second rejection should fail with 400",
    400,
    async () => {
      await api.functional.ecommerceMall.admin.admin.sellers.reject(
        adminConnection,
        {
          sellerId: sellerJoin.id,
          body: {
            rejectionReason: "Another rejection reason",
          } satisfies IEcommerceMallSeller.IUpdate,
        },
      );
    },
  );
  // 5. Verify the seller status and rejection data are preserved
  TestValidator.equals(
    "approval status still rejected",
    firstRejection.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "original rejection reason preserved",
    firstRejection.rejectionReason,
    originalReason,
  );
  TestValidator.predicate(
    "rejected_at still set",
    firstRejection.rejectedAt !== null,
  );
}
