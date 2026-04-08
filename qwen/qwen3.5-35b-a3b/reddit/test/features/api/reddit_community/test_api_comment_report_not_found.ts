import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

/**
 * Test admin access control for comment reports across communities.
 *
 * Validates that admins can only access reports from communities where they have moderation privileges. When an admin
 * attempts to retrieve a report from a community without privileges, the system returns a 404 Not Found error.
 *
 * This test creates a member account who generates content (post, comment, report) in one community, while the admin
 * has privileges in a different community. The admin then attempts to access the report, which should fail.
 *
 * 1. Generate two distinct community IDs representing Community A (admin privileges) and Community B (content location)
 * 2. Register and authenticate an admin user with privileges in Community A
 * 3. Register and authenticate a member user for Community B
 * 4. Member creates a text post in Community B
 * 5. Member creates a comment on that post in Community B
 * 6. Member submits a report against the comment in Community B
 * 7. Admin attempts to retrieve the report using their admin connection
 * 8. Verify 404 error is returned since admin lacks privileges in Community B
 */
export async function test_api_comment_report_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate two different community IDs (Community A and Community B)
  const communityA_id = typia.random<string & tags.Format<"uuid">>();
  const communityB_id = typia.random<string & tags.Format<"uuid">>();
  // 1. Create admin with privileges in Community A
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Create member for Community B
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 3. Member creates post in Community B
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        post_type: "text",
        reddit_community_community_id: communityB_id,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member creates comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Member creates report on the comment
  const report =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Admin tries to access the report (should fail with 404)
  // Since admin has privileges in Community A, but report is in Community B
  await TestValidator.error(
    "admin cannot access report from different community",
    async () => {
      await api.functional.redditCommunity.admin.posts.comments.reports.at(
        adminConnection,
        {
          postId: post.id,
          commentId: comment.id,
          reportId: report.id,
        },
      );
    },
  );
}
