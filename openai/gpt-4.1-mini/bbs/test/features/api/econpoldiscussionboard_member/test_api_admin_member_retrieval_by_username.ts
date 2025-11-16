import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

/**
 * Test to retrieve detailed information of a specific econPolDiscussionBoard
 * member by unique username.
 *
 * The test authenticates as an admin, creates a member account for testing,
 * then retrieves member details to verify authorization, data integrity, and
 * correct API behavior.
 */
export async function test_api_admin_member_retrieval_by_username(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminAuthorized: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: `admin${RandomGenerator.alphaNumeric(8)}`,
        email: `admin${RandomGenerator.alphaNumeric(8)}@domain.com`,
        password: `Password123!`,
      } satisfies IEconPolDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Create a member account
  const memberCreateBody = {
    username: `member${RandomGenerator.alphaNumeric(8)}`,
    password: `Password123!`,
    email: `member${RandomGenerator.alphaNumeric(8)}@domain.com`,
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const memberCreated: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      { body: memberCreateBody },
    );
  typia.assert(memberCreated);

  // 3. Retrieve the member details as admin
  const memberRetrieved: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardMembers.at(
      connection,
      { memberUsername: memberCreateBody.username },
    );
  typia.assert(memberRetrieved);

  // 4. Validate that retrieved member data matches the created member data
  TestValidator.equals(
    "username matches",
    memberRetrieved.username,
    memberCreated.username,
  );
  TestValidator.equals(
    "email matches",
    memberRetrieved.email,
    memberCreated.email,
  );

  // 5. Validate timestamps and deletion status presence with clear expectations
  TestValidator.predicate(
    "created_at is a non-empty string",
    typeof memberRetrieved.created_at === "string" &&
      memberRetrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty string",
    typeof memberRetrieved.updated_at === "string" &&
      memberRetrieved.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null, undefined, or a non-empty string",
    memberRetrieved.deleted_at === null ||
      memberRetrieved.deleted_at === undefined ||
      (typeof memberRetrieved.deleted_at === "string" &&
        memberRetrieved.deleted_at.length > 0),
  );
}
