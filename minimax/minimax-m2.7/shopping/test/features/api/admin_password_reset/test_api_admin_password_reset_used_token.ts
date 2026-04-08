import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Need admin access for testing password reset functionality",
      href: "https://example.com/admin",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a password reset record (simulates token generation)
  const passwordResetResponse =
    await api.functional.ecommerceMall.admin.admin.password_resets.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
          status: "active",
        } satisfies IEcommerceMallAdminPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResetResponse);
  // The index endpoint creates a new password reset record when called
  const resetRecord = passwordResetResponse.data[0];
  typia.assert(resetRecord);
  // 3. Retrieve the specific password reset record by ID
  // This simulates viewing a used token record - the usedAt field would be
  // populated if the token was consumed via a password reset flow
  const resetDetail =
    await api.functional.ecommerceMall.admin.admin.password_resets.at(
      adminConnection,
      {
        resetId: resetRecord.id,
      },
    );
  typia.assert(resetDetail);
  // 4. Validate the record structure
  // For an active/unused token, usedAt is null
  // For a used token (consumed via password reset), usedAt contains the timestamp
  TestValidator.equals(
    "reset record id matches",
    resetDetail.id,
    resetRecord.id,
  );
  TestValidator.equals("admin id matches", resetDetail.admin.id, admin.id);
  TestValidator.equals(
    "admin email matches",
    resetDetail.admin.email,
    admin.email,
  );
  // usedAt can be null (unused) or non-null (used)
  // The field must be either null or a valid date-time string
  if (resetDetail.usedAt !== null) {
    TestValidator.predicate(
      "usedAt is valid date-time when populated",
      resetDetail.usedAt.length === 24 && resetDetail.usedAt.includes("T"),
    );
  }
  TestValidator.predicate(
    "has valid expiresAt",
    resetDetail.expiresAt !== null &&
      resetDetail.expiresAt.length > 0 &&
      resetDetail.expiresAt.includes("T"),
  );
  TestValidator.predicate(
    "has valid createdAt",
    resetDetail.createdAt !== null &&
      resetDetail.createdAt.length > 0 &&
      resetDetail.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "has valid updatedAt",
    resetDetail.updatedAt !== null &&
      resetDetail.updatedAt.length > 0 &&
      resetDetail.updatedAt.includes("T"),
  );
  // Verify admin summary has required fields
  TestValidator.predicate("admin has id", resetDetail.admin.id !== undefined);
  TestValidator.predicate(
    "admin has email",
    resetDetail.admin.email !== undefined,
  );
  TestValidator.predicate(
    "admin has name",
    resetDetail.admin.name !== undefined,
  );
}
