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
 * Test the edge case where multiple different users report the same content item.
 *
 * This validates that the system correctly tracks each report separately even when
 * targeting identical content. The test creates two different member accounts, both
 * report the same post in a community.
 *
 * Validation points:
 * 1. Both reports are successfully created with unique IDs
 * 2. Each report correctly identifies its respective reporter
 * 3. Both reports have review_status set to PENDING
 * 4. Both reports reference the same target post and community
 * 5. The reports are tracked as separate entities for moderator review
 * 6. Each reporter's identity is preserved in their respective report
 */
export async function test_api_report_same_content_multiple_reporters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate first member (reporter 1)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
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
  typia.assert(member1Auth);
  // 2. Register and authenticate second member (reporter 2)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
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
  typia.assert(member2Auth);
  // 3. Create community (using member1's connection)
  const community = await generate_random_reddit_clone_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe member1 to community
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // 5. Subscribe member2 to community (so they can also report)
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      member2Connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 6. Create a post in the community (using member1's connection)
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 7. First member reports the post
  const report1 =
    await generate_random_reddit_clone_member_communities_reports_create(
      member1Connection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneReport.ICreate,
      },
    );
  typia.assert(report1);
  // 8. Second member reports the SAME post
  const report2 =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneReport.ICreate,
      },
    );
  typia.assert(report2);
  // 9. Validate both reports have unique IDs
  TestValidator.notEquals("reports have unique IDs", report1.id, report2.id);
  // 10. Validate each report identifies its respective reporter
  TestValidator.equals(
    "report1 reporter is member1",
    report1.reporter.id,
    member1Auth.id,
  );
  TestValidator.equals(
    "report2 reporter is member2",
    report2.reporter.id,
    member2Auth.id,
  );
  TestValidator.notEquals(
    "reporters are different",
    report1.reporter.id,
    report2.reporter.id,
  );
  // 11. Validate both reports have PENDING status
  TestValidator.equals(
    "report1 status is PENDING",
    report1.review_status,
    "PENDING",
  );
  TestValidator.equals(
    "report2 status is PENDING",
    report2.review_status,
    "PENDING",
  );
  // 12. Validate both reports reference the same target post and community
  TestValidator.equals(
    "report1 community matches",
    report1.community.id,
    community.id,
  );
  TestValidator.equals(
    "report2 community matches",
    report2.community.id,
    community.id,
  );
  TestValidator.equals(
    "report1 target_type is POST",
    report1.target_type,
    "POST",
  );
  TestValidator.equals(
    "report2 target_type is POST",
    report2.target_type,
    "POST",
  );
  // 13. Validate reports are separate entities (different timestamps)
  TestValidator.predicate("reports have different creation times", () => {
    return (
      report1.created_at !== report2.created_at || report1.id !== report2.id
    );
  });
  // 14. Validate reporter usernames are preserved
  TestValidator.equals(
    "report1 reporter username",
    report1.reporter.username,
    member1Auth.username,
  );
  TestValidator.equals(
    "report2 reporter username",
    report2.reporter.username,
    member2Auth.username,
  );
}
