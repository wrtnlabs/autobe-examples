import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate admin profile retrieval by authenticated administrators.
 *
 * Business goal:
 *
 * - Ensure that when an adminUser signs up (join), their administrative profile
 *   is later retrievable via GET
 *   /discussionBoard/adminUser/adminUsers/{adminUserId} by both themselves and
 *   other authenticated admins.
 * - Confirm that the detailed profile matches core fields from the join-auth
 *   response, respects lifecycle semantics (createdAt/updatedAt, deletedAt),
 *   and does not expose sensitive credential internals.
 *
 * Steps:
 *
 * 1. Register Admin A using POST /auth/adminUser/join and capture the
 *    IDiscussionBoardAdminuser.IAuthorized response.
 * 2. Optionally create a discussion-board article category as Admin A using POST
 *    /discussionBoard/adminUser/articleCategories to simulate normal admin
 *    operations before profile lookup.
 * 3. As Admin A (current connection already holds Admin A token), call GET
 *    /discussionBoard/adminUser/adminUsers/{adminUserId} with adminUserId set
 *    to Admin A.id, and assert the returned IDiscussionBoardAdminuser is
 *    structurally valid and consistent with Admin A's authorized snapshot.
 * 4. Validate business invariants on the retrieved profile:
 *
 *    - Id equals Admin A.id.
 *    - DisplayName equals the display_name used at join (or at least equals the
 *         displayName from the authorized response).
 *    - Email equals Admin A.email from the authorized response.
 *    - EmailVerified and accountStatus are consistent with Admin A snapshot.
 *    - CreatedAt/updatedAt follow temporal rules (createdAt <= updatedAt).
 *    - DeletedAt is null or undefined for a fresh admin.
 *    - LastLoginAt, if present, is nullable/valid but not assumed to be set.
 * 5. Register Admin B via another POST /auth/adminUser/join; the SDK will update
 *    Authorization header to Admin B's token.
 * 6. As Admin B, call GET /discussionBoard/adminUser/adminUsers/{adminUserId} with
 *    adminUserId = Admin A.id, confirming cross-admin visibility of Admin A's
 *    profile with the same key profile invariants.
 */
export async function test_api_admin_user_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A via join
  const joinRequestA = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAAuth: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestA,
    });
  typia.assert(adminAAuth);

  // Basic sanity checks on Admin A authorized payload
  TestValidator.predicate(
    "admin A id should be a non-empty string",
    adminAAuth.id.length > 0,
  );
  TestValidator.predicate(
    "admin A email should be non-empty",
    adminAAuth.email.length > 0,
  );
  TestValidator.predicate(
    "admin A status should be non-empty",
    adminAAuth.status.length > 0,
  );

  // 2. Optionally create an article category as Admin A
  const categoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. As Admin A, fetch their own detailed profile
  const adminAProfile: IDiscussionBoardAdminuser =
    await api.functional.discussionBoard.adminUser.adminUsers.at(connection, {
      adminUserId: adminAAuth.id,
    });
  typia.assert(adminAProfile);

  // 4. Validate business invariants on Admin A profile
  TestValidator.equals(
    "admin profile id should match authorized id",
    adminAProfile.id,
    adminAAuth.id,
  );
  TestValidator.equals(
    "admin profile displayName should match authorized displayName",
    adminAProfile.displayName,
    adminAAuth.displayName,
  );
  TestValidator.equals(
    "admin profile email should match authorized email",
    adminAProfile.email,
    adminAAuth.email,
  );
  TestValidator.equals(
    "admin profile emailVerified should match authorized emailVerified",
    adminAProfile.emailVerified,
    adminAAuth.emailVerified,
  );
  TestValidator.equals(
    "admin profile accountStatus should match authorized status",
    adminAProfile.accountStatus,
    adminAAuth.status,
  );

  // createdAt/updatedAt temporal relations: createdAt <= updatedAt
  TestValidator.predicate(
    "admin profile createdAt should not be empty",
    adminAProfile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "admin profile updatedAt should not be empty",
    adminAProfile.updatedAt.length > 0,
  );

  const createdAtTime = new Date(adminAProfile.createdAt).getTime();
  const updatedAtTime = new Date(adminAProfile.updatedAt).getTime();

  TestValidator.predicate(
    "admin profile createdAt should be a valid date-time",
    !Number.isNaN(createdAtTime),
  );
  TestValidator.predicate(
    "admin profile updatedAt should be a valid date-time",
    !Number.isNaN(updatedAtTime),
  );
  TestValidator.predicate(
    "admin profile createdAt should be earlier than or equal to updatedAt",
    createdAtTime <= updatedAtTime,
  );

  // deletedAt should be null or undefined for fresh account (no non-null expectations)
  TestValidator.predicate(
    "admin profile deletedAt should be null or undefined for new admin",
    adminAProfile.deletedAt === null || adminAProfile.deletedAt === undefined,
  );

  // lastLoginAt can be null/undefined/defined; just ensure no contradiction
  if (adminAProfile.lastLoginAt !== undefined) {
    // typia.assert already ensures correct type when defined; we only assert
    // that if it's non-null, it parses as a valid date-time string.
    if (adminAProfile.lastLoginAt !== null) {
      const lastLoginTime = new Date(adminAProfile.lastLoginAt).getTime();
      TestValidator.predicate(
        "admin profile lastLoginAt, when non-null, should be valid date-time",
        !Number.isNaN(lastLoginTime),
      );
    }
  }

  // 5. Register Admin B and switch context to Admin B (SDK updates Authorization)
  const joinRequestB = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminBAuth: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestB,
    });
  typia.assert(adminBAuth);

  TestValidator.predicate(
    "admin B id should be non-empty",
    adminBAuth.id.length > 0,
  );

  // 6. As Admin B, fetch Admin A's profile again and verify invariants
  const adminAProfileByB: IDiscussionBoardAdminuser =
    await api.functional.discussionBoard.adminUser.adminUsers.at(connection, {
      adminUserId: adminAAuth.id,
    });
  typia.assert(adminAProfileByB);

  TestValidator.equals(
    "cross-admin read: id matches Admin A id",
    adminAProfileByB.id,
    adminAAuth.id,
  );
  TestValidator.equals(
    "cross-admin read: email matches Admin A email",
    adminAProfileByB.email,
    adminAAuth.email,
  );
  TestValidator.equals(
    "cross-admin read: displayName matches Admin A displayName",
    adminAProfileByB.displayName,
    adminAAuth.displayName,
  );
  TestValidator.equals(
    "cross-admin read: accountStatus matches Admin A status",
    adminAProfileByB.accountStatus,
    adminAAuth.status,
  );

  // Ensure no sensitive credential fields are present beyond the DTO contract
  // (typia.assert already enforces the exact shape of IDiscussionBoardAdminuser).
}
