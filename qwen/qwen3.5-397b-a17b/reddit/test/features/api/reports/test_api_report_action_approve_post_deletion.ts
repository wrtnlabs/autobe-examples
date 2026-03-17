import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportAction";
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
import { generate_random_reddit_clone_member_communities_reports_actions_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_actions_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";
import { prepare_random_reddit_clone_report_action } from "../../../prepare/prepare_random_reddit_clone_report_action";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_action_approve_post_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community - owner becomes moderator automatically
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
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
  // 2. Authenticate as post author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 3. Subscribe author to community
  const authorSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(authorSubscription);
  // 4. Create a text post that will be reported
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
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
  // 5. Authenticate as reporter2 (the one who will submit the report)
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2 = await authorize_member_join(reporter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(reporter2);
  // 6. Subscribe reporter2 to community
  const reporter2Subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      reporter2Connection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(reporter2Subscription);
  // 7. Reporter2 submits a report on the post
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      reporter2Connection,
      {
        body: {
          target_type: "POST",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(report);
  // Verify initial report status is PENDING
  TestValidator.equals(
    "initial report status",
    report.review_status,
    "PENDING",
  );
  TestValidator.equals("report target type", report.target_type, "POST");
  // 8. Community owner (moderator) approves the report
  const action =
    await generate_random_reddit_clone_member_communities_reports_actions_create(
      ownerConnection,
      {
        body: {
          action: "APPROVE",
        },
        params: {
          communityId: community.id,
          reportId: report.id,
        },
      },
    );
  typia.assert(action);
  // Validate action record
  TestValidator.equals("action is APPROVE", action.action, "APPROVE");
  TestValidator.equals(
    "action report target type",
    action.report.target_type,
    "POST",
  );
  TestValidator.equals(
    "action report review status",
    action.report.review_status,
    "APPROVED",
  );
  TestValidator.equals("moderator is owner", action.moderator.is_owner, true);
  // Validate moderator identity matches community owner
  TestValidator.equals(
    "moderator member id matches owner",
    action.moderator.member.id,
    owner.id,
  );
  TestValidator.equals(
    "moderator member username matches owner",
    action.moderator.member.username,
    owner.username,
  );
}
