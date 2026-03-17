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

export async function test_api_report_dismiss_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner) and create their connection
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community (auto becomes owner)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Register member B (poster) and create their connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Member B subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberBConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Register member C (reporter) and create their connection
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  // 7. Member C submits a report targeting the post
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_community_member_communities_reports_create(
      memberCConnection,
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
  // Main test: Member A (owner) dismisses the report
  const dismissed =
    await api.functional.community.member.communities.reports.dismiss(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(dismissed);
  // Assert status is 'dismissed'
  TestValidator.equals("status is dismissed", dismissed.status, "dismissed");
  // Assert resolver is non-null and matches member A's identity
  TestValidator.predicate("resolver is non-null", dismissed.resolver !== null);
  TestValidator.equals(
    "resolver id matches member A",
    dismissed.resolver!.id,
    memberA.id,
  );
  // Assert post is non-null and matches the reported post
  TestValidator.predicate("post is non-null", dismissed.post !== null);
  TestValidator.equals(
    "post id matches reported post",
    dismissed.post!.id,
    post.id,
  );
  // Assert comment is null (post was reported, not a comment)
  TestValidator.equals("comment is null", dismissed.comment, null);
  // Assert reason matches the reason originally submitted by member C
  TestValidator.equals("reason matches", dismissed.reason, reportReason);
  // Assert reporter matches member C's identity
  TestValidator.equals(
    "reporter id matches member C",
    dismissed.reporter.id,
    memberC.id,
  );
}
