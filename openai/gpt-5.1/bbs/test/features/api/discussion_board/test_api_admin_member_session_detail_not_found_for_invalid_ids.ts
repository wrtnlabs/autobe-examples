import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserSession";

export async function test_api_admin_member_session_detail_not_found_for_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Register an admin user and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create an article category to satisfy scenario dependency
  const categoryBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Create first member user (member A) and ensure they have a session via login
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // Explicit login to ensure at least one persisted member session exists
  const memberALoginBody = {
    email: memberAAuthorized.email,
    password: memberAJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginAuthorized);

  const memberAId = memberALoginAuthorized.id;

  // 4. Create second member user (member B) and ensure they have a session via login
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberBAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  const memberBLoginBody = {
    email: memberBAuthorized.email,
    password: memberBJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberBLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoginAuthorized);

  const memberBId = memberBLoginAuthorized.id;

  // 5. As admin, we need to call the member session detail endpoint. However,
  // the API surface does not provide a way to list sessions or retrieve a
  // concrete session ID for a member. The dedicated at() function for
  // sessions requires a concrete sessionId, but we cannot obtain a real one
  // through available SDK APIs. Therefore we rely on random UUID values to
  // represent invalid or mismatched identifiers.

  // Switch back to the admin context so that subsequent calls are performed
  // as an adminUser actor.
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Scenario 1: mismatched identifiers simulated by pairing the
  // memberUserId of member A with a random sessionId that is very unlikely to
  // belong to that user. We expect the call to fail with an error.
  const mismatchedSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "admin cannot view session with mismatched memberUserId and sessionId",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.sessions.at(
        connection,
        {
          memberUserId: memberAId,
          sessionId: mismatchedSessionId,
        },
      );
    },
  );

  // 7. Scenario 2: use a random UUID as both memberUserId and sessionId where
  // there should be no corresponding member or session at all. This should
  // also result in a not-found style error.
  const unknownMemberId = typia.random<string & tags.Format<"uuid">>();
  const unknownSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "admin cannot view session for completely unknown memberUser and sessionId",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.sessions.at(
        connection,
        {
          memberUserId: unknownMemberId,
          sessionId: unknownSessionId,
        },
      );
    },
  );
}
