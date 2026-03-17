import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_retrieval_by_community_owner_for_post_report(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the community owner and create an authenticated connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register a second member (the reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {});
  // Step 4: Reporter subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      reporterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Reporter creates a text post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPost.ICreate;
  const post = await api.functional.community.member.communities.posts.create(
    reporterConnection,
    {
      communityId: community.id,
      body: postBody,
    },
  );
  typia.assert(post);
  // Step 6: Reporter submits a report against the post
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        body: {
          post_id: post.id,
          reason: reportReason,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(report);
  // Test execution: Owner retrieves the report
  const retrieved =
    await api.functional.community.member.communities.reports.at(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(retrieved);
  // Validations
  TestValidator.equals("report id matches", retrieved.id, report.id);
  TestValidator.equals("report status is pending", retrieved.status, "pending");
  TestValidator.equals("resolver is null", retrieved.resolver, null);
  TestValidator.equals(
    "reporter id matches",
    retrieved.reporter.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.predicate("post is non-null", retrieved.post !== null);
  TestValidator.equals("post id matches", retrieved.post!.id, post.id);
  TestValidator.equals("comment is null", retrieved.comment, null);
  TestValidator.equals("reason matches", retrieved.reason, reportReason);
}
