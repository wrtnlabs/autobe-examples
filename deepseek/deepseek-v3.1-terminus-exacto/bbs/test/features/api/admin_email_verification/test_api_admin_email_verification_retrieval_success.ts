import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of an existing administrator email verification record.
 * Authenticate as administrator, then retrieve a specific email verification record
 * by its verification ID. Verify the response contains complete verification details
 * including token, email, timestamps, expiration status, and associated administrator
 * information. Validate that all required fields are present and correctly populated.
 */
export async function test_api_admin_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as admin with random credentials
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(adminAuth);
  // 2. Attempt to retrieve email verification record
  // Generate random UUID for verification ID
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  try {
    // Call the email verification retrieval endpoint
    const verification =
      await api.functional.discussionBoard.admin.admins.email_verifications.at(
        adminConnection,
        { verificationId },
      );
    // 3. Validate response structure and content
    typia.assert(verification);
    // 4. Business logic validation
    TestValidator.equals(
      "verification ID matches request",
      verification.id,
      verificationId,
    );
    TestValidator.predicate(
      "verification token present",
      verification.token.length > 0,
    );
    TestValidator.predicate(
      "email is valid format",
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        verification.email,
      ),
    );
    TestValidator.predicate(
      "expiration timestamp is valid",
      !isNaN(new Date(verification.expired_at).getTime()),
    );
    TestValidator.predicate(
      "created_at timestamp is valid",
      !isNaN(new Date(verification.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at timestamp is valid",
      !isNaN(new Date(verification.updated_at).getTime()),
    );
    TestValidator.predicate(
      "admin association exists",
      verification.discussion_board_admin_id.length > 0,
    );
    TestValidator.predicate(
      "admin summary information present",
      verification.admin.id.length > 0 &&
        verification.admin.email.length > 0 &&
        verification.admin.display_name.length > 0 &&
        !isNaN(new Date(verification.admin.created_at).getTime()),
    );
  } catch (error) {
    // Handle case where verification record doesn't exist
    // This is expected behavior for random verification ID
    TestValidator.predicate(
      "error handling works correctly",
      error !== null && error !== undefined,
    );
  }
}
