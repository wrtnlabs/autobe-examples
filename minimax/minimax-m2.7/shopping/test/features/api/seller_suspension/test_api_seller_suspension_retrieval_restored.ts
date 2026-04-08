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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_retrieval_restored(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via admin join
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
  // 2. Register a seller
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
  // 3. Approve the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(approvedSeller);
  // 4. Admin suspends the seller with a reason
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspension =
    await api.functional.ecommerceMall.admin.admin.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: suspensionReason,
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  const suspensionId = suspension.id;
  // 5. Admin unsuspends the seller with a restoration reason
  const restoredReason = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.ecommerceMall.admin.admin.sellers.unsuspend(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        restoredReason: restoredReason,
      } satisfies IEcommerceMallSeller.IUnsuspend,
    },
  );
  // 6. Retrieve the suspension record by ID
  const retrievedSuspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.at(
      adminConnection,
      {
        suspensionId: suspensionId,
      },
    );
  typia.assert(retrievedSuspension);
  // 7. Verify the record contains all expected fields
  // Verify suspension ID
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspensionId,
  );
  // Verify reason is preserved
  TestValidator.equals(
    "reason matches",
    retrievedSuspension.reason,
    suspensionReason,
  );
  // Verify suspended_at is populated
  TestValidator.predicate(
    "suspended_at is valid ISO date",
    !!retrievedSuspension.suspended_at &&
      !isNaN(Date.parse(retrievedSuspension.suspended_at)),
  );
  // Verify restored_at is populated (the key validation for restored record)
  TestValidator.predicate(
    "restored_at is populated",
    retrievedSuspension.restored_at !== null &&
      retrievedSuspension.restored_at !== undefined,
  );
  TestValidator.predicate(
    "restored_at is valid ISO date",
    !!retrievedSuspension.restored_at &&
      !isNaN(Date.parse(retrievedSuspension.restored_at!)),
  );
  // Verify restored_reason matches
  TestValidator.equals(
    "restored_reason matches",
    retrievedSuspension.restored_reason,
    restoredReason,
  );
  // Verify seller details are included
  TestValidator.equals(
    "seller id matches",
    retrievedSuspension.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedSuspension.seller.email,
    seller.email,
  );
  // Verify suspendedBy admin is populated (name, email)
  TestValidator.predicate(
    "suspendedBy admin exists",
    retrievedSuspension.suspendedBy !== null &&
      retrievedSuspension.suspendedBy !== undefined,
  );
  TestValidator.equals(
    "suspendedBy admin id matches",
    retrievedSuspension.suspendedBy.id,
    admin.id,
  );
  TestValidator.equals(
    "suspendedBy admin email matches",
    retrievedSuspension.suspendedBy.email,
    admin.email,
  );
  TestValidator.equals(
    "suspendedBy admin name matches",
    retrievedSuspension.suspendedBy.name,
    admin.name,
  );
  // Verify restoredBy admin is populated (name, email) - key validation for restored record
  const restoredBy = retrievedSuspension.restoredBy;
  TestValidator.predicate(
    "restoredBy admin exists",
    restoredBy !== null && restoredBy !== undefined,
  );
  if (restoredBy !== null && restoredBy !== undefined) {
    TestValidator.equals(
      "restoredBy admin id matches",
      restoredBy.id,
      admin.id,
    );
    TestValidator.equals(
      "restoredBy admin email matches",
      restoredBy.email,
      admin.email,
    );
    TestValidator.equals(
      "restoredBy admin name matches",
      restoredBy.name,
      admin.name,
    );
  }
}
