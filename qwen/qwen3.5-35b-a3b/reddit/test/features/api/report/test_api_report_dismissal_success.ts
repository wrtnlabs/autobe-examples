import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismissal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin as moderator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create a random community (since no community creation endpoint is available)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    communityId,
  );
  // 5. Submit a report on the post
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Verify initial status is pending (0)
  TestValidator.equals("report status is pending", report.status_id, 0);
  // 7. Dismiss the report with resolution notes
  const resolutionNotes = RandomGenerator.paragraph({ sentences: 2 });
  const dismissedReport =
    await api.functional.redditCommunity.admin.reports.dismiss(
      adminConnection,
      {
        reportId: report.id,
        body: {
          resolution_notes: resolutionNotes,
        } satisfies IRedditCommunityReport.IDismissRequest,
      },
    );
  typia.assert(dismissedReport);
  // 8. Verify report status changed to dismissed (2)
  TestValidator.equals(
    "report status changed to dismissed",
    dismissedReport.status_id,
    2,
  );
  // 9. Verify report remains accessible and not deleted
  TestValidator.equals(
    "report deleted_at is null (not deleted)",
    dismissedReport.deleted_at,
    null,
  );
  // 10. Verify reported content (post) remains accessible
  TestValidator.equals(
    "target post exists",
    dismissedReport.targetPost !== null,
    true,
  );
  TestValidator.equals(
    "post title unchanged",
    post.title,
    dismissedReport.targetPost!.title,
  );
  TestValidator.equals(
    "post vote score unchanged",
    post.vote_score,
    dismissedReport.targetPost!.vote_score,
  );
  // 11. Verify updated_at timestamp reflects dismissal action
  TestValidator.predicate(
    "updated_at is after report creation",
    new Date(dismissedReport.updated_at) > new Date(report.created_at),
  );
  // 12. Verify report community matches post community
  TestValidator.equals(
    "report community matches post community",
    dismissedReport.community.id,
    post.community.id,
  );
}
