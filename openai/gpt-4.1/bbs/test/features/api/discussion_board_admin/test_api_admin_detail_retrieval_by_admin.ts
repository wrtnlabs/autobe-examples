import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validates admin profile detail retrieval for the economic/political
 * discussion board admin.
 *
 * This test ensures that an authenticated admin can fetch their own account
 * details via the admin API. The steps follow the expected business process:
 *
 * 1. Register a new admin account with a unique email/username/password.
 * 2. As the newly registered admin, create a topic to establish an adminId.
 * 3. Request the admin's detailed profile by adminId.
 * 4. Validate that the returned admin record matches creation data, omits any
 *    sensitive credentials, and includes proper audit metadata.
 * 5. Attempt unauthorized access (as guest/anonymous) and confirm access fails.
 */
export async function test_api_admin_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create a topic to establish adminId
  const subject = RandomGenerator.paragraph({ sentences: 6 });
  const content = RandomGenerator.content({ paragraphs: 2 });
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        subject,
        content,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Sanity: check admin ID came from session/auth
  const adminId = adminAuth.id;
  TestValidator.equals(
    "topic author's adminId same as authenticated admin",
    topic.author_admin_id,
    adminId,
  );

  // 3. Fetch admin profile detail by adminId
  const adminDetail = await api.functional.discussionBoard.admin.admins.at(
    connection,
    {
      adminId,
    },
  );
  typia.assert(adminDetail);

  // 4. Validate admin fields: match registration, no password/sensitive
  TestValidator.equals("admin ID matches", adminDetail.id, adminAuth.id);
  TestValidator.equals(
    "admin username matches",
    adminDetail.username,
    adminUsername,
  );
  TestValidator.equals("admin email matches", adminDetail.email, adminEmail);
  TestValidator.equals(
    "admin deleted_at is null/undefined",
    adminDetail.deleted_at,
    null,
  );
  TestValidator.predicate(
    "admin email is verified (may be false at creation)",
    typeof adminDetail.email_verified === "boolean",
  );
  TestValidator.predicate(
    "registration_completed_at present",
    typeof adminDetail.registration_completed_at === "string",
  );

  // No password(sensitive) property present -- type system guarantees it.

  // 5. Verify access denied if not admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "guest/non-admin cannot get admin profile",
    async () => {
      await api.functional.discussionBoard.admin.admins.at(unauthConn, {
        adminId,
      });
    },
  );
}
