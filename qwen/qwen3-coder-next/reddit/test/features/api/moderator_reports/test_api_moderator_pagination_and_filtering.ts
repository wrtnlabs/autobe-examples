import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    bio: null,
    avatar_url: null,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IRedditLikeModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  const moderatorSessionConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorSessionConnection, {
    body: {
      email: moderatorJoinInput.email,
      password: moderatorJoinInput.password,
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 2. Create member account to submit reports
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
    username: RandomGenerator.name(),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  const memberSessionConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberSessionConnection, {
    body: {
      email: memberJoinInput.email,
      password: memberJoinInput.password,
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Create multiple reports using utility function
  const reportCount = 25;
  const reportReasons = [
    "Spam content",
    "Harassment",
    "Inappropriate images",
    "Broken links",
    "Duplicate content",
    "Violation of rules",
    "Misinformation",
    "Cyberbullying",
    "Illegal content",
    "Privacy violation",
    "Copyright infringement",
    "Threatening behavior",
    "Hate speech",
    "False information",
    "Offensive language",
  ];
  const createdReports: IRedditLikeReport[] = [];
  for (let i = 0; i < reportCount; i++) {
    const report = await generate_random_reddit_like_member_reports_create(
      memberSessionConnection,
      {
        body: {
          reason: reportReasons[i % reportReasons.length],
        } satisfies IRedditLikeReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);
  }
  // 4. Test pagination on review endpoint
  // First page with limit 10
  const firstPageResult =
    await api.functional.redditLike.moderator.communities.review.index(
      moderatorSessionConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          search: undefined,
          status: "pending",
          reporter_id: undefined,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page returns correct number of records",
    firstPageResult.data.length,
    10,
  );
  TestValidator.equals(
    "first page pagination info correct",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page pagination info correct",
    firstPageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records is correct",
    () => firstPageResult.pagination.records === reportCount,
  );
  TestValidator.predicate(
    "pages calculation correct",
    () => firstPageResult.pagination.pages === Math.ceil(reportCount / 10),
  );
  // Second page with limit 10
  const secondPageResult =
    await api.functional.redditLike.moderator.communities.review.index(
      moderatorSessionConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          search: undefined,
          status: "pending",
          reporter_id: undefined,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at_desc",
          page: 2,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page returns correct number of records",
    secondPageResult.data.length,
    10,
  );
  TestValidator.equals(
    "second page pagination info correct",
    secondPageResult.pagination.current,
    2,
  );
  // Last page
  const lastPageResult =
    await api.functional.redditLike.moderator.communities.review.index(
      moderatorSessionConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          search: undefined,
          status: "pending",
          reporter_id: undefined,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at_desc",
          page: 3,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page returns remaining records",
    lastPageResult.data.length,
    5,
  );
  // 5. Test status filtering
  const statusResult =
    await api.functional.redditLike.moderator.communities.review.index(
      moderatorSessionConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          search: undefined,
          status: "pending",
          reporter_id: undefined,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(statusResult);
  TestValidator.predicate("status filtering works", () =>
    statusResult.data.every(
      (report: IRedditLikeReport.ISummary) => report.status === "pending",
    ),
  );
  // 6. Test timestamp filtering
  if (createdReports.length >= 2) {
    const firstReportTime = createdReports[0].created_at;
    const midReportTime =
      createdReports[Math.floor(createdReports.length / 2)].created_at;
    const filteredResult =
      await api.functional.redditLike.moderator.communities.review.index(
        moderatorSessionConnection,
        {
          communityId: "00000000-0000-0000-0000-000000000000",
          body: {
            search: undefined,
            status: "pending",
            reporter_id: undefined,
            reported_post_id: undefined,
            reported_comment_id: undefined,
            created_at_min: midReportTime,
            created_at_max: undefined,
            sort: "created_at_desc",
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    typia.assert(filteredResult);
    TestValidator.predicate(
      "timestamp filtering returns correct results",
      () => filteredResult.data.length > 0,
    );
  }
  // 7. Test empty results
  const emptyResult =
    await api.functional.redditLike.moderator.communities.review.index(
      moderatorSessionConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          search: "nonexistentkeyword12345",
          status: "pending",
          reporter_id: undefined,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns no results",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records is 0",
    emptyResult.pagination.records,
    0,
  );
  // 8. Test reporter_id filtering
  const reporterResult =
    await api.functional.redditLike.moderator.communities.review.index(
      moderatorSessionConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          search: undefined,
          status: "pending",
          reporter_id: member.id,
          reported_post_id: undefined,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reporterResult);
  TestValidator.predicate("reporter_id filtering works", () =>
    reporterResult.data.every(
      (report: IRedditLikeReport.ISummary) => report.reporter.id === member.id,
    ),
  );
}
