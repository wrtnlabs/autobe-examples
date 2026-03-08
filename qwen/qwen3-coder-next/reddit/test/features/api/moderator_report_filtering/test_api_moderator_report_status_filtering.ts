import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_moderator_report_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Test report filtering by different statuses
  const statusFilters: Array<"pending" | "approved" | "dismissed"> = [
    "pending",
    "approved",
    "dismissed",
  ];
  for (const status of statusFilters) {
    const result = await api.functional.redditLike.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          status: status,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
    typia.assert(result);
    // Verify pagination structure
    TestValidator.equals(
      "pagination has correct structure",
      result.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit matches",
      result.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "has non-negative total records",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages is non-negative",
      result.pagination.pages >= 0,
    );
    // Verify reports structure
    if (result.data.length > 0) {
      for (const report of result.data) {
        typia.assert(report);
        TestValidator.equals(
          "report status matches filter",
          report.status,
          status,
        );
        TestValidator.equals(
          "has reporter info",
          typeof report.reporter.id,
          "string",
        );
        TestValidator.equals(
          "has content type",
          report.reported_content_type === "post" ||
            report.reported_content_type === "comment",
          true,
        );
        TestValidator.equals(
          "has content id",
          typeof report.reported_content_id,
          "string",
        );
      }
    }
  }
  // 4. Test combined filters with valid UUID
  const combinedResult =
    await api.functional.redditLike.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          reporter_id: member.id satisfies string & tags.Format<"uuid">,
          page: 1,
          limit: 5,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 5. Test pagination with different limit values
  const smallPage = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 3,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(smallPage);
  const largePage = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 50,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(largePage);
  // 6. Test sorting option
  const sortedResult = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        status: "pending",
        sort: "created_at_desc",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(sortedResult);
}
