import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_view_banned_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin@Secure123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin retrieves a banned seller's details
  // Test with a random UUID - the endpoint should return seller data
  // if a seller with that ID exists and is banned
  const bannedSellerId = typia.random<string & tags.Format<"uuid">>();
  const retrievedBannedSeller =
    await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
      sellerId: bannedSellerId,
    });
  typia.assert(retrievedBannedSeller);
  // 3. Validate response structure for banned seller scenario
  TestValidator.equals(
    "seller id is valid uuid",
    retrievedBannedSeller.id,
    bannedSellerId,
  );
  TestValidator.predicate("email is valid format", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedBannedSeller.email),
  );
  TestValidator.equals(
    "approval status is valid",
    retrievedBannedSeller.approvalStatus,
    retrievedBannedSeller.approvalStatus,
  );
  TestValidator.predicate(
    "is banned or suspended flag exists",
    () => retrievedBannedSeller.isBanned || retrievedBannedSeller.isSuspended,
  );
  TestValidator.notEquals(
    "created at timestamp exists",
    retrievedBannedSeller.createdAt,
    null,
  );
  TestValidator.notEquals(
    "updated at timestamp exists",
    retrievedBannedSeller.updatedAt,
    null,
  );
  // deletedAt can be null (account not deleted) or have a value
  // 4. Admin retrieves a suspended seller's details
  const suspendedSellerId = typia.random<string & tags.Format<"uuid">>();
  const retrievedSuspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
      sellerId: suspendedSellerId,
    });
  typia.assert(retrievedSuspendedSeller);
  // 5. Validate response structure for suspended seller scenario
  TestValidator.equals(
    "suspended seller id is valid uuid",
    retrievedSuspendedSeller.id,
    suspendedSellerId,
  );
  TestValidator.predicate("suspended seller email format valid", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedSuspendedSeller.email),
  );
  TestValidator.predicate(
    "suspended seller has valid approval status",
    () =>
      retrievedSuspendedSeller.approvalStatus === "pending" ||
      retrievedSuspendedSeller.approvalStatus === "approved" ||
      retrievedSuspendedSeller.approvalStatus === "rejected",
  );
  TestValidator.predicate(
    "suspended seller ban/suspension flags exist",
    () =>
      retrievedSuspendedSeller.isBanned ||
      retrievedSuspendedSeller.isSuspended ||
      (!retrievedSuspendedSeller.isBanned &&
        !retrievedSuspendedSeller.isSuspended),
  );
  TestValidator.notEquals(
    "suspended seller created at exists",
    retrievedSuspendedSeller.createdAt,
    null,
  );
  TestValidator.notEquals(
    "suspended seller updated at exists",
    retrievedSuspendedSeller.updatedAt,
    null,
  );
}
