import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_reports_posts_report_create_report } from "../../../generate/generate_random_community_platform_user_reports_posts_report_create_report";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_report } from "../../../prepare/prepare_random_community_platform_post_report";

export async function test_api_post_report_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and obtain authorized connection
  const baseConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(baseConnection, {});
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  // Post as text type for simplicity
  const postCreateBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    postType: "text",
    content: RandomGenerator.content({ paragraphs: 1 }),
  };
  // Call user communities posts create
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. Submit a report for the post
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_community_platform_user_reports_posts_report_create_report(
      userConnection,
      {
        params: { postId: post.id },
        body: { reason: reportReason },
      },
    );
  typia.assert(report);
  // 5. Validate report fields
  TestValidator.predicate(
    "report id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
  );
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  // Validate reporting user summary matches authorized user summary
  TestValidator.equals(
    "reporting user id matches authorized user",
    report.reportingUser.id,
    userAuthorized.id,
  );
  TestValidator.equals(
    "reporting user email matches authorized user",
    report.reportingUser.email,
    userAuthorized.email,
  );
  TestValidator.equals(
    "reporting user username matches authorized user",
    report.reportingUser.username,
    userAuthorized.username,
  );
  TestValidator.equals(
    "reporting user display name matches authorized user",
    report.reportingUser.displayName,
    userAuthorized.display_name,
  );
  // Validate reported post summary matches the post
  TestValidator.equals(
    "reported post id matches created post",
    report.reportedPost.id,
    post.id,
  );
  TestValidator.equals(
    "reported post title matches created post",
    report.reportedPost.title,
    post.title,
  );
  TestValidator.equals(
    "reported post postType matches created post",
    report.reportedPost.postType,
    post.postType,
  );
  // Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "report created_at ISO format",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]+)?Z$/.test(
      report.created_at,
    ),
  );
  TestValidator.predicate(
    "report updated_at ISO format",
    /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]+)?Z$/.test(
      report.updated_at,
    ),
  );
  // Deleted_at must be either null or ISO 8601 date-time format
  if (report.deleted_at !== null) {
    TestValidator.predicate(
      "report deleted_at ISO format",
      /^[0-9]{4}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]+)?Z$/.test(
        report.deleted_at ?? "",
      ),
    );
  }
}
