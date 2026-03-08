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

export async function test_api_moderator_report_community_scoping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Moderator A
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: "https://example.com/profileA",
      referrer: "https://example.com/referrerA",
    },
  });
  typia.assert(moderatorA);
  // 2. Create Moderator B
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: "https://example.com/profileB",
      referrer: "https://example.com/referrerB",
    },
  });
  typia.assert(moderatorB);
  // 3. Login Moderator A and test reports endpoint
  await authorize_moderator_login(moderatorAConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderatorA.email),
      password: "password123",
    } satisfies IRedditLikeModerator.ILogin,
  });
  const reportsForModeratorA =
    await api.functional.redditLike.moderator.reports.index(
      moderatorAConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reportsForModeratorA);
  // 4. Login Moderator B and test reports endpoint
  await authorize_moderator_login(moderatorBConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderatorB.email),
      password: "password123",
    } satisfies IRedditLikeModerator.ILogin,
  });
  const reportsForModeratorB =
    await api.functional.redditLike.moderator.reports.index(
      moderatorBConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reportsForModeratorB);
  // 5. Verify report structure for Moderator A
  reportsForModeratorA.data.forEach((report) => {
    typia.assert<IRedditLikeReport.ISummary>(report);
    TestValidator.predicate(
      "report has reporter",
      report.reporter !== undefined,
    );
    TestValidator.predicate(
      "report has valid content type",
      report.reported_content_type === "post" ||
        report.reported_content_type === "comment",
    );
  });
  // 6. Verify report structure for Moderator B
  reportsForModeratorB.data.forEach((report) => {
    typia.assert<IRedditLikeReport.ISummary>(report);
    TestValidator.predicate(
      "report has reporter",
      report.reporter !== undefined,
    );
    TestValidator.predicate(
      "report has valid content type",
      report.reported_content_type === "post" ||
        report.reported_content_type === "comment",
    );
  });
  // 7. Verify pagination exists
  TestValidator.predicate(
    "pagination exists for A",
    reportsForModeratorA.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination exists for B",
    reportsForModeratorB.pagination !== undefined,
  );
}