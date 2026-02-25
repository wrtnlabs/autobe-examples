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

/**
 * Test super administrator email verification retrieval workflow.
 * 1. Authenticate as super administrator using join endpoint
 * 2. Retrieve email verification record using valid verification ID
 * 3. Validate complete verification record structure and data integrity
 */
export async function test_api_super_admin_email_verification_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "super_admin_password_123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Retrieve email verification record
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verificationRecord =
    await api.functional.discussionBoard.superAdmin.super_admins.email_verifications.at(
      superAdminConnection,
      {
        verificationId,
      },
    );
  typia.assert(verificationRecord);
  // 3. Validate verification record structure
  TestValidator.equals(
    "verification ID matches",
    verificationRecord.id,
    verificationId,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    verificationRecord.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has creation timestamp",
    verificationRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated timestamp",
    verificationRecord.updated_at.length > 0,
  );
  TestValidator.predicate(
    "has super admin summary",
    verificationRecord.superAdmin !== null,
  );
  // Verify timestamp formats are ISO strings
  TestValidator.predicate(
    "expired_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(verificationRecord.expired_at),
  );
  TestValidator.predicate(
    "created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(verificationRecord.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(verificationRecord.updated_at),
  );
  // Verify super admin summary structure
  TestValidator.predicate(
    "super admin has ID",
    verificationRecord.superAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "super admin has permission level",
    verificationRecord.superAdmin.permission_level.length > 0,
  );
  TestValidator.predicate(
    "super admin has assignment date",
    verificationRecord.superAdmin.assignment_date.length > 0,
  );
}
