import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_content_reports_listing(
  connection: api.IConnection,
) {
  // 1. Moderator joins and authenticates
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modJoinBody = {
    email: modEmail,
    password: "ModPass123!",
    href: "https://reddit.example/mod",
    referrer: "https://reddit.example/home",
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: modJoinBody,
  });
  typia.assert(moderator);

  // 2. User joins and logs in
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: "UserPass123!",
    href: "https://reddit.example/user",
    referrer: "https://reddit.example/home",
  } satisfies IRedditCommunityUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  const userLoginBody = {
    email: userEmail,
    password: "UserPass123!",
    href: "https://reddit.example/login",
    referrer: "https://reddit.example/landing",
  } satisfies IRedditCommunityUser.ILogin;
  const userLoggedIn = await api.functional.auth.user.login(connection, {
    body: userLoginBody,
  });
  typia.assert(userLoggedIn);

  // 3. User creates content reports
  const createContentReportPromises: Promise<IRedditCommunityContentReport>[] =
    [];
  // Let's create 5 reports with random data
  for (let i = 0; i < 5; i++) {
    const contentId = typia.random<string & tags.Format<"uuid">>();
    const reportReasonId = typia.random<string & tags.Format<"uuid">>();
    const contentType: "post" | "comment" = RandomGenerator.pick([
      "post",
      "comment",
    ] as const);
    const createReportBody = {
      content_id: contentId,
      report_reason_id: reportReasonId,
      content_type: contentType,
      additional_details: i % 2 === 0 ? null : `Detail about report ${i}`,
    } satisfies IRedditCommunityContentReport.ICreate;
    createContentReportPromises.push(
      api.functional.redditCommunity.user.content_reports.create(connection, {
        body: createReportBody,
      }),
    );
  }
  const reports = await Promise.all(createContentReportPromises);
  reports.forEach((report) => typia.assert(report));

  // 4. Moderator logs in and queries content reports with various filters
  const modLoginBody = {
    email: modEmail,
    password: "ModPass123!",
    href: "https://reddit.example/mod-login",
    referrer: "https://reddit.example/mod",
  } satisfies IRedditCommunityModerator.ILogin;
  const modLoggedIn = await api.functional.auth.moderator.login(connection, {
    body: modLoginBody,
  });
  typia.assert(modLoggedIn);

  // 5. Query - basic list
  const listRequestBasic = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityContentReport.IRequest;
  const listBasic =
    await api.functional.redditCommunity.moderator.content_reports.index(
      connection,
      {
        body: listRequestBasic,
      },
    );
  typia.assert(listBasic);
  TestValidator.predicate(
    "listBasic.pagination.page is 1",
    listBasic.pagination.current === 1,
  );
  TestValidator.predicate(
    "listBasic.data.length <= limit",
    listBasic.data.length <= 10,
  );

  // 6. Query with filter by content_type "post"
  const listRequestPost = {
    page: 1,
    limit: 10,
    content_type: "post",
  } satisfies IRedditCommunityContentReport.IRequest;
  const listPosts =
    await api.functional.redditCommunity.moderator.content_reports.index(
      connection,
      {
        body: listRequestPost,
      },
    );
  typia.assert(listPosts);
  TestValidator.predicate(
    "listPosts all content_type are post",
    listPosts.data.every((it) => it.content_type === "post"),
  );

  // 7. Query with filter by content_type "comment"
  const listRequestComments = {
    page: 1,
    limit: 10,
    content_type: "comment",
  } satisfies IRedditCommunityContentReport.IRequest;
  const listComments =
    await api.functional.redditCommunity.moderator.content_reports.index(
      connection,
      {
        body: listRequestComments,
      },
    );
  typia.assert(listComments);
  TestValidator.predicate(
    "listComments all content_type are comment",
    listComments.data.every((it) => it.content_type === "comment"),
  );

  // 8. Query with prefix pagination (limit 2) to test paging
  const listPage1 = {
    page: 1,
    limit: 2,
  } satisfies IRedditCommunityContentReport.IRequest;
  const listPage2 = {
    page: 2,
    limit: 2,
  } satisfies IRedditCommunityContentReport.IRequest;
  const page1 =
    await api.functional.redditCommunity.moderator.content_reports.index(
      connection,
      { body: listPage1 },
    );
  const page2 =
    await api.functional.redditCommunity.moderator.content_reports.index(
      connection,
      { body: listPage2 },
    );
  typia.assert(page1);
  typia.assert(page2);
  // Validate ids between pages do not overlap
  const page1Ids = new Set(page1.data.map((r) => r.id));
  const page2Ids = new Set(page2.data.map((r) => r.id));
  const overlap = [...page1Ids].some((id) => page2Ids.has(id));
  TestValidator.predicate(
    "pagination page 1 and 2 have distinct ids",
    !overlap,
  );

  // 9. Query with sort by created_at descending
  const listSortDesc = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IRedditCommunityContentReport.IRequest;
  const sortedDesc =
    await api.functional.redditCommunity.moderator.content_reports.index(
      connection,
      {
        body: listSortDesc,
      },
    );
  typia.assert(sortedDesc);
  // Validate sorted descending
  for (let i = 1; i < sortedDesc.data.length; i++) {
    TestValidator.predicate(
      `sortedDesc data[${i - 1}] created_at >= data[${i}] created_at`,
      sortedDesc.data[i - 1].created_at >= sortedDesc.data[i].created_at,
    );
  }

  // 10. Attempt to query without authorization (clear headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.redditCommunity.moderator.content_reports.index(
      unauthConn,
      {
        body: listRequestBasic,
      },
    );
  });

  // 11. Attempt user access to content reports endpoint - should fail
  // Use a separate connection with user token
  const userConn: api.IConnection = {
    ...connection,
    headers: { Authorization: userLoggedIn.token.access },
  };
  await TestValidator.error("user role cannot access reports", async () => {
    await api.functional.redditCommunity.moderator.content_reports.index(
      userConn,
      {
        body: listRequestBasic,
      },
    );
  });
}
