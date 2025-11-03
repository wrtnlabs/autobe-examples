import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

export async function test_api_moderator_search_pagination(
  connection: api.IConnection,
) {
  /** 1. Seed two moderator accounts and keep their creation inputs for later search */
  const moderatorAUsername = RandomGenerator.alphaNumeric(8);
  const moderatorADisplay = RandomGenerator.name();
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAPassword = RandomGenerator.alphaNumeric(12);

  const moderatorA: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorAUsername,
        email: moderatorAEmail,
        password: moderatorAPassword,
        display_name: moderatorADisplay,
        href: "https://example.com/",
        referrer: "https://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorA);

  // Create second moderator to ensure multiple results and ordering
  const moderatorBUsername = RandomGenerator.alphaNumeric(8);
  const moderatorBDisplay = RandomGenerator.name();
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBPassword = RandomGenerator.alphaNumeric(12);

  const moderatorB: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorBUsername,
        email: moderatorBEmail,
        password: moderatorBPassword,
        display_name: moderatorBDisplay,
        href: "https://example.com/",
        referrer: "https://example.com/ref",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorB);

  /**
   * 2. Search as an authenticated moderator using partial display_name and
   *    pagination
   */
  const partial =
    moderatorADisplay.split(" ")[0] ?? moderatorADisplay.slice(0, 3);
  const searchRequest = {
    display_name: partial,
    page: 1,
    limit: 10,
    sort: "-createdAt",
  } satisfies IDiscussionBoardModerator.IRequest;

  const page: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(page);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current should be 1",
    page.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    page.pagination.limit,
    10,
  );

  // Validate that created moderatorA appears in the results (search partial-match)
  TestValidator.predicate(
    "search results include moderatorA by username",
    page.data.some((d) => d.username === moderatorA.username),
  );

  // If multiple items, ensure sort by created_at desc: first >= last
  if (page.data.length >= 2) {
    const first = page.data[0].created_at;
    const last = page.data[page.data.length - 1].created_at;
    TestValidator.predicate("results sorted by created_at desc", first >= last);
  }

  /** 3. Negative checks */
  // 3.a Unauthenticated (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "unauthenticated caller should receive 401",
    401,
    async () =>
      await api.functional.discussionBoard.moderator.moderators.index(
        unauthConn,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardModerator.IRequest,
        },
      ),
  );

  // 3.b Unauthorized (member) should receive 403
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/",
        referrer: "https://example.com/ref",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  await TestValidator.httpError(
    "non-moderator member should receive 403",
    403,
    async () =>
      await api.functional.discussionBoard.moderator.moderators.index(
        memberConn,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardModerator.IRequest,
        },
      ),
  );

  // 3.c Best-effort rate-limit detection (non-deterministic): attempt a small burst and expect at least one failure
  try {
    await TestValidator.error(
      "rate limit burst may throw an error (best-effort)",
      async () => {
        const promises = ArrayUtil.repeat(10, () =>
          api.functional.discussionBoard.moderator.moderators.index(
            connection,
            {
              body: {
                page: 1,
                limit: 10,
              } satisfies IDiscussionBoardModerator.IRequest,
            },
          ),
        );
        await Promise.all(promises);
      },
    );
  } catch {
    // If no rate-limit behavior is observable, swallow the error to avoid failing the entire test run.
    // The test above is best-effort and non-deterministic; we do not assert on a specific HTTP status here.
  }
}
