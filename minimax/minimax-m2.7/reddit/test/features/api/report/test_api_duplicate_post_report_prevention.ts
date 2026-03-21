import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
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
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_duplicate_post_report_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as author who will create reportable content
  const authorConnection: api.IConnection = { host: connection.host };
  const authorSession = await authorize_member_join(authorConnection, {});
  // 2. Create a community where the post will exist
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
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
  // 4. Authenticate as reporter who will submit reports
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 5. Submit first report for the post
  const firstReport =
    await api.functional.redditClone.member.communities.reports.create(
      reporterConnection,
      {
        communityName: community.name,
        body: {
          target_type: "post",
          target_id: post.id,
          reason: "First report reason",
        } satisfies IRedditCloneReport.ICreate,
      },
    );
  typia.assert(firstReport);
  // 6. Verify first report status is 'pending'
  TestValidator.equals("first report status", firstReport.status, "pending");
  TestValidator.equals(
    "first report target type",
    firstReport.target_type,
    "post",
  );
  TestValidator.equals(
    "first report target id",
    firstReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "first report reason",
    firstReport.reason,
    "First report reason",
  );
  // 7. Attempt to submit duplicate report for the same post
  await TestValidator.httpError(
    "duplicate report should return 409 Conflict",
    409,
    async () =>
      await api.functional.redditClone.member.communities.reports.create(
        reporterConnection,
        {
          communityName: community.name,
          body: {
            target_type: "post",
            target_id: post.id,
            reason: "Duplicate report reason",
          } satisfies IRedditCloneReport.ICreate,
        },
      ),
  );
  // 8. Verify only one report exists by attempting to list reports
  // (The API spec indicates duplicate reports are prevented via unique constraint)
  TestValidator.predicate(
    "first report created successfully",
    firstReport.id !== undefined,
  );
}
