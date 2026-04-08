import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
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

export async function test_api_post_report_cross_community_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Admin who moderates Community A but not Community B
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminAuth.token.access,
    },
  });
  typia.assert(admin);
  // 2. Member setup - Member who will create post in Community B
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
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Member creates post in Community B
  // Note: In a real scenario, communities and moderator assignments would exist
  // For this test, we use a placeholder community ID to simulate Community B
  const communityBId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityBId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 4. Member submits report on the post in Community B
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberLoginConnection,
      {
        postId: post.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(report);
  // 5. Admin attempts to access the report from Community B (should be rejected)
  // The admin is not a moderator of Community B, so access should be denied
  await TestValidator.httpError(
    "admin cannot view report from non-moderated community",
    [403, 404],
    async () => {
      await api.functional.redditCommunity.admin.posts.reports.at(
        adminLoginConnection,
        {
          postId: post.id,
          reportId: report.id,
        },
      );
    },
  );
}
