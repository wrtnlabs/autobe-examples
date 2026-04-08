import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
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
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_community_reports_moderator_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account for moderation role
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  typia.assert(admin);
  // 2. Member setup - create member account for creating content
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 3. Generate community identifier for testing
  const communityCode = typia.random<string & tags.Format<"uuid">>();
  // 4. Create a post in the community (member acts as author)
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityCode,
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
        }),
      },
    },
  );
  typia.assert(post);
  // 5. Admin authenticates for report viewing
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    },
  });
  // 6. Call PATCH endpoint to view pending reports for the community
  const reportsResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunitycode(
      adminAuthConnection,
      {
        communityCode: communityCode,
        body: {
          status_id: "0", // pending reports
          limit: 10,
        },
      },
    );
  typia.assert(reportsResponse);
  // 7. Validate pagination structure exists with default values
  TestValidator.equals(
    "pagination has current page",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    reportsResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination has records count",
    reportsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination has pages count",
    reportsResponse.pagination.pages,
    0,
  );
  // 8. Validate data array exists and is empty when no reports exist
  TestValidator.equals(
    "data array is empty when no reports",
    reportsResponse.data.length,
    0,
  );
  // 9. Validate response structure matches expected pagination schema
  TestValidator.predicate(
    "response has valid pagination structure",
    () =>
      typeof reportsResponse.pagination === "object" &&
      typeof reportsResponse.pagination.current === "number" &&
      typeof reportsResponse.pagination.limit === "number" &&
      typeof reportsResponse.pagination.records === "number" &&
      typeof reportsResponse.pagination.pages === "number" &&
      Array.isArray(reportsResponse.data),
  );
}
