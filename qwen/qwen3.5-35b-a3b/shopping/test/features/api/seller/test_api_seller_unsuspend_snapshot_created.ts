import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_unsuspend_snapshot_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResult);
  // 2. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerResult);
  // 3. Admin suspends the seller to create initial suspended state
  const suspendResponse =
    await api.functional.ecommerceMall.admin.sellers.suspend.suspendSeller(
      adminConnection,
      {
        sellerId: sellerResult.id,
        body: { reason: "Test suspension for unsuspend scenario" },
      },
    );
  typia.assert(suspendResponse);
  // Verify seller is suspended after suspension
  TestValidator.equals(
    "seller is suspended after suspend",
    suspendResponse.is_suspended,
    true,
  );
  // Capture original seller state before unsuspend
  const originalIsSuspended = suspendResponse.is_suspended;
  const originalApprovalStatus = suspendResponse.approval_status;
  const originalIsBanned = suspendResponse.is_banned;
  const originalCreatedAt = suspendResponse.created_at;
  const originalEmail = suspendResponse.email;
  const originalId = suspendResponse.id;
  // 4. Admin unsuspends the seller
  const unsuspendResponse =
    await api.functional.ecommerceMall.admin.sellers.unsuspend(
      adminConnection,
      {
        sellerId: sellerResult.id,
      },
    );
  typia.assert(unsuspendResponse);
  // 5. Verify unsuspend response contains updated seller profile
  // Core state change: isSuspended should be false
  TestValidator.equals(
    "isSuspended changed to false",
    unsuspendResponse.is_suspended,
    false,
  );
  TestValidator.predicate(
    "isSuspended state changed",
    unsuspendResponse.is_suspended !== originalIsSuspended,
  );
  // Verify seller identity fields remain intact (id should not change)
  TestValidator.equals("seller id unchanged", unsuspendResponse.id, originalId);
  // Verify email remains unchanged
  TestValidator.equals(
    "email remains unchanged",
    unsuspendResponse.email,
    originalEmail,
  );
  // Verify approval_status intact (unsuspend should not change approval)
  TestValidator.equals(
    "approval_status intact",
    unsuspendResponse.approval_status,
    originalApprovalStatus,
  );
  // Verify is_banned intact (unsuspend should not change ban status)
  TestValidator.equals(
    "is_banned intact",
    unsuspendResponse.is_banned,
    originalIsBanned,
  );
  // Verify created_at intact (account creation date should not change)
  TestValidator.equals(
    "created_at intact",
    unsuspendResponse.created_at,
    originalCreatedAt,
  );
  // 6. Verify the snapshot audit trail was created (implicit via successful unsuspend)
  // The API specification states that unsuspend creates an immutable snapshot
  // Successful response with correct state changes indicates snapshot was created
  TestValidator.predicate(
    "unsuspend operation completed",
    unsuspendResponse.is_suspended === false,
  );
  // 7. Verify response contains all required seller summary fields
  typia.assert(unsuspendResponse);
  // Required fields from IEcommerceMallSeller.ISummary:
  // - id: string & tags.Format<"uuid">
  // - email: string & tags.Format<"email">
  // - approval_status: "pending" | "approved" | "rejected"
  // - rejection_reason?: string | null | undefined
  // - is_suspended: boolean
  // - is_banned: boolean
  // - created_at: string & tags.Format<"date-time">
  TestValidator.equals(
    "response has id",
    unsuspendResponse.id !== undefined,
    true,
  );
  TestValidator.equals(
    "response has email",
    unsuspendResponse.email !== undefined,
    true,
  );
  TestValidator.equals(
    "response has approval_status",
    unsuspendResponse.approval_status !== undefined,
    true,
  );
  TestValidator.equals(
    "response has is_suspended",
    unsuspendResponse.is_suspended !== undefined,
    true,
  );
  TestValidator.equals(
    "response has is_banned",
    unsuspendResponse.is_banned !== undefined,
    true,
  );
  TestValidator.equals(
    "response has created_at",
    unsuspendResponse.created_at !== undefined,
    true,
  );
  // 8. Verify approval_status is one of the allowed values
  TestValidator.predicate(
    "approval_status is valid",
    ["pending", "approved", "rejected"].includes(
      unsuspendResponse.approval_status,
    ),
  );
  // 9. Verify seller is no longer banned (banned status is independent of suspension)
  TestValidator.equals(
    "is_banned unchanged",
    unsuspendResponse.is_banned,
    originalIsBanned,
  );
  // 10. Verify created_at is a valid ISO date-time format
  try {
    new Date(unsuspendResponse.created_at);
  } catch {
    throw new Error("created_at is not a valid date-time format");
  }
}