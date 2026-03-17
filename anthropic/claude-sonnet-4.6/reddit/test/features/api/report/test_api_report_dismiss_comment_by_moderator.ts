import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_dismiss_comment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Owner subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      ownerConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Owner creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Owner creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    ownerConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Register moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 7. Owner assigns the moderator
  const moderatorAssignment =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: moderator.id },
      },
    );
  typia.assert(moderatorAssignment);
  // 8. Register reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 9. Reporter submits a report targeting the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        params: { communityId: community.id },
        body: {
          comment_id: comment.id,
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // 10. Moderator dismisses the report
  const resolved =
    await api.functional.community.member.communities.reports.resolve(
      moderatorConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: { status: "dismissed" } satisfies ICommunityReport.IUpdate,
      },
    );
  typia.assert(resolved);
  // Validate: status is "dismissed"
  TestValidator.equals(
    "report status is dismissed",
    resolved.status,
    "dismissed",
  );
  // Validate: resolver is non-null and matches the moderator
  TestValidator.predicate("resolver is non-null", resolved.resolver !== null);
  TestValidator.equals(
    "resolver id matches moderator",
    resolved.resolver!.id,
    moderator.id,
  );
  // Validate: comment is non-null and matches the reported comment
  TestValidator.predicate("comment is non-null", resolved.comment !== null);
  TestValidator.equals(
    "comment id matches original",
    resolved.comment!.id,
    comment.id,
  );
  // Validate: post is null (report targeted a comment, not a post)
  TestValidator.equals("post is null for comment report", resolved.post, null);
  // Validate: reason matches what was submitted
  TestValidator.equals(
    "reason matches submitted reason",
    resolved.reason,
    reportReason,
  );
}
