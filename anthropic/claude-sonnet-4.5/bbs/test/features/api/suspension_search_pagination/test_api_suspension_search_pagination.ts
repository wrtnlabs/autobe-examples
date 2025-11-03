import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test pagination functionality when searching user suspensions.
 *
 * This test validates that the suspension search API correctly implements
 * pagination by creating a sufficient dataset and testing various page sizes
 * and navigation.
 *
 * Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create 25 member accounts for suspension test data
 * 3. Create a suspension for each member
 * 4. Test pagination with page size 10 (should have 3 pages)
 * 5. Test pagination with page size 25 (should have 1 page)
 * 6. Test pagination with page size 50 (should have 1 page)
 * 7. Verify pagination metadata accuracy
 * 8. Verify different pages return different records
 */
export async function test_api_suspension_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create 25 member accounts
  const memberCount = 25;
  const members = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const member = await api.functional.discussionBoard.members.create(
      connection,
      {
        body: {
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<30> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
    typia.assert(member);
    return member;
  });

  // Step 3: Create suspensions for all members
  const suspensionReasons = [
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
    "inappropriate_content",
  ] as const;
  const suspensions = await ArrayUtil.asyncRepeat(
    memberCount,
    async (index) => {
      const suspension =
        await api.functional.discussionBoard.moderator.moderation.suspensions.create(
          connection,
          {
            body: {
              discussion_board_member_id: members[index].id,
              suspension_reason: RandomGenerator.pick(suspensionReasons),
              suspension_details: RandomGenerator.paragraph({
                sentences: 5,
                wordMin: 4,
                wordMax: 8,
              }),
              suspended_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            } satisfies IDiscussionBoardUserSuspension.ICreate,
          },
        );
      typia.assert(suspension);
      return suspension;
    },
  );

  // Step 4: Test pagination with page size 10
  const pageSize10Page1 =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(pageSize10Page1);

  TestValidator.equals(
    "page size 10 - total records",
    pageSize10Page1.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "page size 10 - total pages",
    pageSize10Page1.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page size 10 - current page",
    pageSize10Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page size 10 - limit",
    pageSize10Page1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page size 10 - page 1 data count",
    pageSize10Page1.data.length,
    10,
  );

  const pageSize10Page2 =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(pageSize10Page2);

  TestValidator.equals(
    "page size 10 page 2 - current page",
    pageSize10Page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page size 10 page 2 - data count",
    pageSize10Page2.data.length,
    10,
  );

  // Verify different pages return different records
  const page1Ids = pageSize10Page1.data.map((s) => s.id);
  const page2Ids = pageSize10Page2.data.map((s) => s.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("no overlap between page 1 and page 2", !hasOverlap);

  const pageSize10Page3 =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(pageSize10Page3);

  TestValidator.equals(
    "page size 10 page 3 - current page",
    pageSize10Page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page size 10 page 3 - data count",
    pageSize10Page3.data.length,
    5,
  );

  // Step 5: Test pagination with page size 25
  const pageSize25 =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(pageSize25);

  TestValidator.equals(
    "page size 25 - total records",
    pageSize25.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "page size 25 - total pages",
    pageSize25.pagination.pages,
    1,
  );
  TestValidator.equals(
    "page size 25 - current page",
    pageSize25.pagination.current,
    1,
  );
  TestValidator.equals("page size 25 - limit", pageSize25.pagination.limit, 25);
  TestValidator.equals("page size 25 - data count", pageSize25.data.length, 25);

  // Step 6: Test pagination with page size 50
  const pageSize50 =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(pageSize50);

  TestValidator.equals(
    "page size 50 - total records",
    pageSize50.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "page size 50 - total pages",
    pageSize50.pagination.pages,
    1,
  );
  TestValidator.equals(
    "page size 50 - current page",
    pageSize50.pagination.current,
    1,
  );
  TestValidator.equals("page size 50 - limit", pageSize50.pagination.limit, 50);
  TestValidator.equals("page size 50 - data count", pageSize50.data.length, 25);

  // Verify all suspensions can be retrieved across pages
  const allRetrievedIds = [
    ...page1Ids,
    ...page2Ids,
    ...pageSize10Page3.data.map((s) => s.id),
  ];
  TestValidator.equals(
    "all suspensions retrieved via pagination",
    allRetrievedIds.length,
    memberCount,
  );

  // Verify unique IDs across all pages
  const uniqueIds = new Set(allRetrievedIds);
  TestValidator.equals(
    "all retrieved IDs are unique",
    uniqueIds.size,
    memberCount,
  );
}
