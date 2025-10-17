import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPollResponseStatus";
import type { IEPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPollQuestionType";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import type { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPollResponse";

/**
 * Moderator search of poll responses with pagination, filters, sorting, and ACL
 * checks.
 *
 * This E2E validates the governance endpoint that lists poll responses for a
 * given post’s poll. It covers:
 *
 * 1. Data setup by member flows: create author → post → likert poll
 * 2. Two separate members submit likert responses with slight time spacing
 * 3. Moderator lists responses with pagination and filters (status/date)
 * 4. Sorting by created_at desc is respected
 * 5. Access control boundaries (unauthenticated and member token are blocked)
 * 6. Not-found handling for an invalid post context
 *
 * Steps
 *
 * - Join as author (member), create a post
 * - Create a Likert poll with allowVoteChange=true and active window
 * - Join as respondent A, submit likert response, wait briefly
 * - Join as respondent B, submit likert response
 * - Join as moderator
 * - List responses and validate pagination, status filter, sorting
 * - Build a date window around one response and re-query to isolate it
 * - Auth boundary checks (unauthenticated; member role)
 * - Not-found postId handling
 */
export async function test_api_poll_responses_search_by_moderator_with_filters(
  connection: api.IConnection,
) {
  // 1) Author joins as member
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      email: authorEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(author);

  // 2) Author creates a post
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        scheduled_publish_at: null,
        topicIds: undefined,
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) Create a Likert poll for the post (active window now..+10m)
  const startAt = new Date(Date.now() - 60_000).toISOString();
  const endAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: {
        question: "Overall, how confident are you about near-term inflation?",
        questionType: "likert",
        visibilityMode: "always_visible",
        expertOnly: false,
        allowVoteChange: true,
        scalePoints: 5,
        scaleMinLabel: "Very Low",
        scaleMaxLabel: "Very High",
        scaleMidLabel: "Neutral",
        startAt,
        endAt,
        options: undefined,
        minVoterReputation: null,
        minAccountAgeHours: null,
        minSelections: null,
        maxSelections: null,
        unitLabel: null,
        numericMin: null,
        numericMax: null,
        numericStep: null,
      } satisfies IEconDiscussPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 4) Respondent A joins and submits a likert response
  const aEmail = typia.random<string & tags.Format<"email">>();
  const respondentA = await api.functional.auth.member.join(connection, {
    body: {
      email: aEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(respondentA);

  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "likert",
        likertValue: 2,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // space creation times for date range test
  await new Promise((r) => setTimeout(r, 25));

  // 5) Respondent B joins and submits another likert response
  const bEmail = typia.random<string & tags.Format<"email">>();
  const respondentB = await api.functional.auth.member.join(connection, {
    body: {
      email: bEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(respondentB);

  await api.functional.econDiscuss.member.posts.poll.responses.create(
    connection,
    {
      postId: post.id,
      body: {
        questionType: "likert",
        likertValue: 5,
      } satisfies IEconDiscussPollResponse.ICreate,
    },
  );

  // 6) Join as moderator and query governance endpoint
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussModerator.ICreate,
  });
  typia.assert(moderator);

  // initial listing to capture createdAt values
  const pageAll =
    await api.functional.econDiscuss.moderator.posts.poll.responses.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IEconDiscussPollResponse.IRequest,
      },
    );
  typia.assert(pageAll);

  // Expect exactly 2 responses in this post's poll
  TestValidator.equals(
    "total responses count is 2",
    pageAll.pagination.records,
    2,
  );
  TestValidator.equals(
    "first page length equals min(records, pageSize)",
    pageAll.data.length,
    Math.min(pageAll.pagination.records, pageAll.pagination.limit),
  );

  // Status filter: only active
  const pageActive =
    await api.functional.econDiscuss.moderator.posts.poll.responses.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 10,
          statuses: ["active"],
        } satisfies IEconDiscussPollResponse.IRequest,
      },
    );
  typia.assert(pageActive);
  TestValidator.predicate(
    "all statuses are active",
    pageActive.data.every((r) => r.status === "active"),
  );

  // Sorting: created_at desc
  const pageDesc =
    await api.functional.econDiscuss.moderator.posts.poll.responses.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEconDiscussPollResponse.IRequest,
      },
    );
  typia.assert(pageDesc);
  const sortedDescOk = pageDesc.data.every(
    (r, i, arr) =>
      i === 0 ||
      new Date(arr[i - 1].createdAt).getTime() >=
        new Date(r.createdAt).getTime(),
  );
  TestValidator.predicate("created_at is sorted desc", sortedDescOk);

  // Date range filter: isolate one response using a widened window for DB precision
  const target = pageDesc.data[0];
  const t0 = new Date(new Date(target.createdAt).getTime() - 500).toISOString();
  const t1 = new Date(new Date(target.createdAt).getTime() + 500).toISOString();
  const pageWindow =
    await api.functional.econDiscuss.moderator.posts.poll.responses.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          pageSize: 10,
          dateFrom: t0,
          dateTo: t1,
        } satisfies IEconDiscussPollResponse.IRequest,
      },
    );
  typia.assert(pageWindow);
  TestValidator.equals(
    "window isolates a single record",
    pageWindow.pagination.records,
    1,
  );
  TestValidator.equals(
    "window item matches target id",
    pageWindow.data[0]?.id,
    target.id,
  );

  // 7) Auth boundary: unauthenticated should error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot list responses",
    async () => {
      await api.functional.econDiscuss.moderator.posts.poll.responses.index(
        unauthConn,
        {
          postId: post.id,
          body: {
            page: 1,
            pageSize: 1,
          } satisfies IEconDiscussPollResponse.IRequest,
        },
      );
    },
  );

  // 8) Auth boundary: member (non-moderator) should error
  const outsiderEmail = typia.random<string & tags.Format<"email">>();
  const outsider = await api.functional.auth.member.join(connection, {
    body: {
      email: outsiderEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(outsider);

  await TestValidator.error(
    "member cannot access moderator responses",
    async () => {
      await api.functional.econDiscuss.moderator.posts.poll.responses.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 1,
            pageSize: 1,
          } satisfies IEconDiscussPollResponse.IRequest,
        },
      );
    },
  );

  // Restore moderator context (join another moderator)
  const mod2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod2Email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussModerator.ICreate,
  });
  typia.assert(moderator2);

  // 9) Not-found handling: non-existent postId should error
  await TestValidator.error("non-existent postId should error", async () => {
    await api.functional.econDiscuss.moderator.posts.poll.responses.index(
      connection,
      {
        postId: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        body: {
          page: 1,
          pageSize: 1,
        } satisfies IEconDiscussPollResponse.IRequest,
      },
    );
  });
}
