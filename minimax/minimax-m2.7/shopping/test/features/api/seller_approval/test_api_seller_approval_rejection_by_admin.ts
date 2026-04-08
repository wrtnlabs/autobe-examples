import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_approval_rejection_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account (creates pending seller approval)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // Verify seller is pending
  TestValidator.equals(
    "seller status is pending",
    sellerJoinResult.approvalStatus,
    "pending",
  );
  // 2. Create admin account via admin request
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminLoginResult);
  // 4. Submit rejection request
  const rejectionReason = "Incomplete business documentation provided.";
  const sellerId = sellerJoinResult.id;
  const rejectionResult =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.reject(
      adminConnection,
      {
        approvalId: sellerId,
        body: {
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallSellerApproval.IReject,
      },
    );
  typia.assert(rejectionResult);
  // 5. Validate response
  TestValidator.equals(
    "approval status is rejected",
    rejectionResult.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectionResult.rejectionReason,
    rejectionReason,
  );
  TestValidator.equals(
    "seller id matches",
    rejectionResult.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "seller approval status is rejected",
    rejectionResult.seller.approvalStatus,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed by admin exists",
    rejectionResult.reviewedByAdmin !== null &&
      rejectionResult.reviewedByAdmin !== undefined,
  );
  TestValidator.equals(
    "reviewing admin id matches",
    rejectionResult.reviewedByAdmin!.id,
    adminLoginResult.id,
  );
}
