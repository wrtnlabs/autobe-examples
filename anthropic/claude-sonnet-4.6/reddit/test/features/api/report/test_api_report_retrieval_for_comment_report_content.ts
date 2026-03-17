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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_retrieval_for_comment_report_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register second member (content creator + reporter)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 4: Second member subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 5: Second member creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Second member creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // Step 7: Second member submits a report targeting the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_community_member_communities_reports_create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          post_id: null,
          reason: reportReason,
        },
        params: { communityId: community.id },
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
  TestValidator.predicate(
    "comment field is non-null",
    retrieved.comment !== null,
  );
  TestValidator.equals("comment id matches", retrieved.comment!.id, comment.id);
  TestValidator.equals("post field is null", retrieved.post, null);
  TestValidator.equals("reporter id matches", retrieved.reporter.id, member.id);
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals("reason matches", retrieved.reason, reportReason);
}
