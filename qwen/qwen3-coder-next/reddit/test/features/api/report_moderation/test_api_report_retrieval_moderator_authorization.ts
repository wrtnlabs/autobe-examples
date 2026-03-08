import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
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

export async function test_api_report_retrieval_moderator_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: "1234",
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: null,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Login as moderator to update connection token
  const moderatorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const moderatorAuth = await api.functional.redditLike.auth.moderator.login(
    moderatorLoginConnection,
    {
      body: {
        email: (moderator.email satisfies string) as string & tags.MaxLength<255> & tags.Format<"email">,
        password: "1234",
      } satisfies IRedditLikeModerator.ILogin,
    },
  );
  typia.assert(moderatorAuth);
  // Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: "1234",
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Login as member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.redditLike.auth.member.login(
    memberLoginConnection,
    {
      body: {
        email: (member.email satisfies string) as string & tags.MaxLength<255> & tags.Format<"email">,
        password: "1234",
      } satisfies IRedditLikeMember.ILogin,
    },
  );
  typia.assert(memberAuth);
  // Create a community name (using random since community creation API is not available)
  const communityName = `community_${RandomGenerator.alphabets(8)}`;
  // Subscribe member to the community (to enable reporting)
  await api.functional.redditLike.member.communities.subscribe.create(
    memberLoginConnection,
    {
      communityName: communityName,
    },
  );
  // Member creates a report on a post
  const report = await api.functional.redditLike.member.reports.create(
    memberLoginConnection,
    {
      body: {
        reported_post_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "This post contains inappropriate content",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Moderator retrieves the report (should succeed)
  const retrievedReport = await api.functional.redditLike.moderator.reports.at(
    moderatorLoginConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // Verify report details match
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter matches",
    retrievedReport.reporter.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedReport.reason,
    "This post contains inappropriate content",
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  // Create another moderator for a different community
  const otherModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const otherModerator = await api.functional.redditLike.auth.moderator.join(
    otherModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: "1234",
        bio: null,
        avatar_url: null,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(otherModerator);
  const otherModeratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.redditLike.auth.moderator.login(
    otherModeratorLoginConnection,
    {
      body: {
        email: (otherModerator.email satisfies string) as string & tags.MaxLength<255> & tags.Format<"email">,
        password: "1234",
      } satisfies IRedditLikeModerator.ILogin,
    },
  );
  // Other moderator should NOT be able to retrieve report from different community
  // This should return 403 Forbidden
  await TestValidator.error(
    "moderator from different community cannot access report",
    async () => {
      await api.functional.redditLike.moderator.reports.at(
        otherModeratorLoginConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}