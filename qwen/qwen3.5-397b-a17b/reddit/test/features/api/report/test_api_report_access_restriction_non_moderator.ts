import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test that a member who is NOT a moderator of a community cannot access reports for that community.
 *
 * This test validates the critical business rule that reports are only accessible to community moderators.
 * The test workflow:
 * 1. Create a member account as community owner/moderator
 * 2. Create a community (owner automatically becomes moderator)
 * 3. Create a post in the community
 * 4. Create a second member account as reporter and submit a report against the post
 * 5. Create a third member account who is a regular subscriber (NOT a moderator)
 * 6. Subscribe the third member to the community
 * 7. Attempt to retrieve the report details using the non-moderator member's credentials
 * 8. Validate that the system properly denies access with an authorization error (403 Forbidden)
 */
export async function test_api_report_access_restriction_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner/moderator account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner automatically becomes moderator)
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create a post in the community (as owner, who is subscribed)
  const post = await generate_random_reddit_clone_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 4. Create reporter account and submit a report against the post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(reporterAuth);
  // Reporter subscribes to the community to be able to report
  await generate_random_reddit_clone_member_subscriptions_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // Reporter submits a report against the post
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      reporterConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 5. Create third member account (non-moderator subscriber)
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriberAuth = await authorize_member_join(subscriberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(subscriberAuth);
  // 6. Subscribe the third member to the community (still NOT a moderator)
  await generate_random_reddit_clone_member_subscriptions_create(
    subscriberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 7. Attempt to retrieve the report details using the non-moderator member's credentials
  // 8. Validate that the system properly denies access with an authorization error (403 Forbidden)
  await TestValidator.error("non-moderator cannot access report", async () => {
    await api.functional.redditClone.member.communities.reports.at(
      subscriberConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  });
}
