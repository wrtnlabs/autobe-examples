import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a moderator cannot view reports for communities they do not moderate.
 *
 * Validates the critical security boundary that moderators can only access reports within their assigned community scope, preventing cross-community information leakage. The test uses existing communities and ensures that a moderator assigned to only one community cannot view reports from another community.
 *
 * Special attention is given to verifying that the moderator's access to reports is strictly limited to communities where they have been assigned moderator privileges, even when they know the exact report ID.
 *
 * 1. Retrieve existing communities from the system.
 * 2. Register a moderator account and assign them as moderator to the first community only.
 * 3. Register two member accounts (member1 and member2).
 * 4. Subscribe member1 to the second community.
 * 5. Member1 creates a post in the second community (outside moderator's scope).
 * 6. Member2 reports that post from the second community.
 * 7. Moderator attempts to retrieve the report by ID.
 * 8. The system should deny access since the moderator is not assigned to the second community.
 */
export async function test_api_report_scope_limitation_different_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve existing communities from the system
  const communitiesResponse =
    await api.functional.redditClone.communities.index(
      { host: connection.host },
      { body: {} satisfies IRedditCloneCommunity.IRequest },
    );
  typia.assert(communitiesResponse);
  // Ensure we have at least 2 communities
  TestValidator.predicate(
    "at least 2 communities exist for testing",
    communitiesResponse.data.length >= 2,
  );
  const communityA = communitiesResponse.data[0];
  const communityB = communitiesResponse.data[1];
  // 2. Register moderator and assign to community A only
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Assign moderator to community A only using their userProfileId from auth response
  const moderatorAssignment =
    await api.functional.redditClone.moderator.communities.moderators.create(
      moderatorConnection,
      {
        communityId: communityA.id,
        body: {
          userProfileId: moderatorAuth.reddit_clone_user_profile_id,
          role: "moderator",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 3. Register two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2Auth);
  // 4. Subscribe member1 to community B
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    member1Connection,
    {
      params: { communityId: communityB.id },
    },
  );
  // 5. Member1 creates a post in community B
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: communityB.id,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member2 reports the post from community B
  const report = await generate_random_reddit_clone_member_reports_create(
    member2Connection,
    {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: "This content violates community guidelines",
      } satisfies IRedditCloneReport.ICreate,
    },
  );
  typia.assert(report);
  // 7 & 8. Moderator attempts to retrieve the report - should fail with 403 or 404
  await TestValidator.error(
    "moderator cannot access reports from communities they do not moderate",
    async () => {
      await api.functional.redditClone.moderator.reports.at(
        moderatorConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
