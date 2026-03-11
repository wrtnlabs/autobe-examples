import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test administrator retrieval of paginated banned users list.
 *
 * Workflow:
 * 1. Admin registers and logs in
 * 2. Create a member account to be banned
 * 3. Admin creates ban record for the member
 * 4. Admin queries ban list with pagination
 * 5. Validate pagination metadata and ban summaries
 * 6. Verify sorting by banned_at descending and only active bans returned
 */
export async function test_api_ban_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Admin creates ban record for the member
  const banReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminLoginConnection,
    {
      body: {
        member_id: memberAuth.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. Admin queries ban list with default pagination
  const banListResponse = await api.functional.discussionBoard.admin.bans.index(
    adminLoginConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "banned_at",
        direction: "desc",
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(banListResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    banListResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", banListResponse.pagination.current, 1);
  TestValidator.equals("limit", banListResponse.pagination.limit, 10);
  TestValidator.predicate(
    "has at least 1 record",
    banListResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    banListResponse.pagination.pages >= 1,
  );
  // 6. Validate ban summaries exist and contain required fields
  TestValidator.predicate(
    "data array exists",
    Array.isArray(banListResponse.data),
  );
  TestValidator.predicate(
    "has at least one ban",
    banListResponse.data.length >= 1,
  );
  const firstBan = banListResponse.data[0];
  TestValidator.predicate("ban id exists", firstBan.id !== undefined);
  TestValidator.predicate(
    "ban id is uuid",
    /^[0-9a-f-]{36}$/i.test(firstBan.id),
  );
  // Validate member info in ban summary
  TestValidator.predicate("member info exists", firstBan.member !== undefined);
  TestValidator.equals(
    "member display name",
    firstBan.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "member status exists",
    firstBan.member.status !== undefined,
  );
  // Validate admin info in ban summary
  TestValidator.predicate("admin info exists", firstBan.admin !== undefined);
  TestValidator.predicate(
    "admin grade exists",
    firstBan.admin.grade !== undefined,
  );
  // Validate ban details
  TestValidator.equals("ban reason matches", firstBan.reason, banReason);
  TestValidator.predicate(
    "banned_at timestamp exists",
    firstBan.banned_at !== undefined,
  );
  TestValidator.predicate(
    "banned_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstBan.banned_at),
  );
  // 7. Verify sorting - most recent ban should be first (our newly created ban)
  TestValidator.equals("first ban is most recent", firstBan.id, banRecord.id);
  // 8. Verify only active bans (deleted_at should be null for active bans)
  // Note: ISummary doesn't include deleted_at, but we validate the ban we created is active
  TestValidator.predicate(
    "ban record is active",
    banRecord.deleted_at === null,
  );
}
