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

export async function test_api_report_post_submission_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the post author and obtain their connection
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 2. Author creates a new community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Author subscribes to the community (prerequisite for creating posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Author creates a text post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPost.ICreate;
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: postBody,
    },
  );
  typia.assert(post);
  // 5. Register the reporter (second member) and obtain their connection
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // 6. Reporter submits a report against the post
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          comment_id: null,
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // 7. Validate the report fields
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate("post is non-null", report.post !== null);
  TestValidator.equals("comment is null", report.comment, null);
  TestValidator.equals("resolver is null", report.resolver, null);
  TestValidator.equals("reason matches", report.reason, reportReason);
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
  // Validate post reference matches
  if (report.post !== null) {
    TestValidator.equals("reported post id matches", report.post.id, post.id);
  }
}
