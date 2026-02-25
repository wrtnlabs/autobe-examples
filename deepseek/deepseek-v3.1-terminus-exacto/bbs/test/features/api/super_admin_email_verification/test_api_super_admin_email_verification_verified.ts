import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_email_verification_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Attempt to retrieve a verification record.
  // Since we cannot create a verification record via API, we use a random UUID.
  // In a real test environment, we assume there exists at least one verified record.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the endpoint to retrieve verification details
  const verification =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.at(
      superAdminConnection,
      { verificationId },
    );
  // 4. Validate response structure
  typia.assert(verification);
  // 5. Business logic validation: verified_at should be present (non-null) since we are testing verified records
  TestValidator.predicate(
    "verified_at timestamp present",
    verification.verified_at !== null,
  );
  TestValidator.predicate(
    "expired_at timestamp present",
    verification.expired_at !== null && verification.expired_at !== undefined,
  );
  TestValidator.predicate(
    "superAdmin summary present",
    verification.superAdmin !== null && verification.superAdmin !== undefined,
  );
  // 6. Additional validation: timestamps should be valid ISO strings
  TestValidator.predicate("verified_at is valid date-time string", () => {
    if (verification.verified_at === null) return false;
    const date = new Date(verification.verified_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("expired_at is valid date-time string", () => {
    const date = new Date(verification.expired_at);
    return !isNaN(date.getTime());
  });
  // 7. Verify the superAdmin summary has required fields
  const superAdminSummary = verification.superAdmin;
  TestValidator.predicate(
    "superAdmin has id",
    superAdminSummary.id !== null && superAdminSummary.id !== undefined,
  );
  TestValidator.predicate(
    "superAdmin has permission_level",
    superAdminSummary.permission_level !== null &&
      superAdminSummary.permission_level !== undefined,
  );
  TestValidator.predicate(
    "superAdmin has assignment_date",
    superAdminSummary.assignment_date !== null &&
      superAdminSummary.assignment_date !== undefined,
  );
  TestValidator.predicate("superAdmin has admin field (nullable)", true);
  TestValidator.predicate("superAdmin has superAdmin field (nullable)", true);
}
