import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

export async function test_api_admin_member_user_restriction_update_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial restriction for a target member user
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const startedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    restriction_level: "posting_restriction",
    reason_category: "spam_advertising",
    started_at: startedAt,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const createdRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert(createdRestriction);

  // Basic invariants on creation
  TestValidator.equals(
    "created restriction_level should match creation body",
    createdRestriction.restriction_level,
    createBody.restriction_level,
  );
  TestValidator.equals(
    "created reason_category should match creation body",
    createdRestriction.reason_category,
    createBody.reason_category,
  );
  TestValidator.equals(
    "created started_at should match creation body",
    createdRestriction.started_at,
    createBody.started_at,
  );
  TestValidator.equals(
    "memberUser.id should equal path memberUserId",
    createdRestriction.memberUser.id,
    memberUserId,
  );

  const originalId = createdRestriction.id;
  const originalCreatedAt = createdRestriction.created_at;
  const originalUpdatedAt = createdRestriction.updated_at;

  // 3. Update the restriction with escalated level and new reason, plus an end time
  const futureEndedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    restriction_level: "full_block",
    reason_category: "repeated_violations",
    ended_at: futureEndedAt,
    // intentionally omit started_at so it should remain unchanged
  } satisfies IDiscussionBoardMemberuserRestriction.IUpdate;

  const updatedRestriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.update(
      connection,
      {
        memberUserId,
        body: updateBody,
      },
    );
  typia.assert(updatedRestriction);

  // 4. Validate update semantics
  TestValidator.equals(
    "restriction id should remain unchanged after update",
    updatedRestriction.id,
    originalId,
  );
  TestValidator.equals(
    "restriction_level should be updated to full_block",
    updatedRestriction.restriction_level,
    updateBody.restriction_level,
  );
  TestValidator.equals(
    "reason_category should be updated to repeated_violations",
    updatedRestriction.reason_category,
    updateBody.reason_category,
  );
  TestValidator.equals(
    "memberUser.id should still equal path memberUserId after update",
    updatedRestriction.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "started_at should remain unchanged when not provided in update payload",
    updatedRestriction.started_at,
    createdRestriction.started_at,
  );
  TestValidator.equals(
    "ended_at should be set to the new future timestamp",
    updatedRestriction.ended_at ?? null,
    futureEndedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    updatedRestriction.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedRestriction.created_at,
    originalCreatedAt,
  );
}
