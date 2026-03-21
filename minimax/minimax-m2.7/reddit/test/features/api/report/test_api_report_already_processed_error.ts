import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_already_processed_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator (community owner) account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create content author account
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Moderator creates community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Author subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 5. Author creates a post for reporting
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 6. Author reports the post to create a pending report
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      authorConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 7. Moderator approves the report (first update - should succeed)
  const approvedReport =
    await api.functional.redditClone.member.communities.reports.update(
      moderatorConnection,
      {
        communityName: community.name,
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IRedditCloneReport.IUpdate,
      },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // 8. Moderator attempts to update the same report again (should fail with 400)
  await TestValidator.httpError(
    "already processed report cannot be updated",
    400,
    async () => {
      await api.functional.redditClone.member.communities.reports.update(
        moderatorConnection,
        {
          communityName: community.name,
          reportId: report.id,
          body: {
            status: "dismissed",
          } satisfies IRedditCloneReport.IUpdate,
        },
      );
    },
  );
}
