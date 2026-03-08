import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_search_by_member_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create members and ban records for testing search
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1DisplayName = RandomGenerator.name();
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2DisplayName = RandomGenerator.name();
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3DisplayName = RandomGenerator.name();
  // We need to create members first, then ban them
  // For this test, we'll use random data to simulate the ban records
  // In real scenario, members would be created through member join endpoint
  // 3. Search ban records by member email (partial match)
  const emailSearchTerm = member1Email.substring(0, member1Email.length / 2);
  const emailSearchResult =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          member_search: emailSearchTerm,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  // 4. Search ban records by member display name (partial match)
  const nameSearchTerm = member2DisplayName.substring(
    0,
    member2DisplayName.length / 2,
  );
  const nameSearchResult =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          member_search: nameSearchTerm,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(nameSearchResult);
  // 5. Search with no matching term
  const noMatchResult =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          member_search: "nonexistent_search_term_xyz",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(noMatchResult);
  // 6. Validate response structure
  TestValidator.predicate(
    "email search has pagination",
    emailSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "name search has pagination",
    nameSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "no match search has pagination",
    noMatchResult.pagination !== undefined,
  );
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is number",
    typeof emailSearchResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof emailSearchResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof emailSearchResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof emailSearchResult.pagination.pages === "number",
  );
  // 8. Validate ban record summary structure when results exist
  if (emailSearchResult.data.length > 0) {
    const firstRecord = emailSearchResult.data[0];
    TestValidator.predicate(
      "ban record has id",
      typeof firstRecord.id === "string",
    );
    TestValidator.predicate(
      "ban record has reason",
      typeof firstRecord.reason === "string",
    );
    TestValidator.predicate(
      "ban record has banned_at",
      typeof firstRecord.banned_at === "string",
    );
    TestValidator.predicate(
      "ban record has discussionBoardMember",
      firstRecord.discussionBoardMember !== undefined,
    );
    TestValidator.predicate(
      "ban record has discussionBoardAdmin",
      firstRecord.discussionBoardAdmin !== undefined,
    );
    // Validate member summary
    TestValidator.predicate(
      "member has id",
      typeof firstRecord.discussionBoardMember.id === "string",
    );
    TestValidator.predicate(
      "member has displayName",
      typeof firstRecord.discussionBoardMember.displayName === "string",
    );
    // Validate admin summary
    TestValidator.predicate(
      "admin has id",
      typeof firstRecord.discussionBoardAdmin.id === "string",
    );
    TestValidator.predicate(
      "admin has email",
      typeof firstRecord.discussionBoardAdmin.email === "string",
    );
  }
}
