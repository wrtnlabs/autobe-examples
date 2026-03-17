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

export async function test_api_report_comment_submission_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the content author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Author creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Author subscribes to their own community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Author creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: typia.random<string & tags.MinLength<1>>(),
        type: "text",
        body: typia.random<string & tags.MinLength<1>>(),
      },
    },
  );
  typia.assert(post);
  // 5. Author creates a top-level comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
      body: {
        content: typia.random<string & tags.MinLength<1>>(),
        parent_id: null,
      },
    },
  );
  typia.assert(comment);
  // 6. Register the reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 7. Reporter submits a report targeting the comment
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: null,
          comment_id: comment.id,
          reason,
        },
      },
    );
  typia.assert(report);
  // Validations
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate("comment is non-null", report.comment !== null);
  TestValidator.equals(
    "reported comment id matches",
    report.comment!.id,
    comment.id,
  );
  TestValidator.equals("post field is null", report.post, null);
  TestValidator.equals("resolver is null", report.resolver, null);
  TestValidator.equals("reason matches", report.reason, reason);
  TestValidator.equals("reporter id matches", report.reporter.id, reporter.id);
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
}
