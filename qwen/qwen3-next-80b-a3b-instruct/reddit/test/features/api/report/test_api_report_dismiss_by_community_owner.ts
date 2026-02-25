import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismiss_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for reporting
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberResponse);
  // 2. Create community owner account for dismissing
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwnerResponse = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(communityOwnerResponse);
  // 3. Member logs in to create a post
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberResponse.email!,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Member creates a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberLoginConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member submits a report on their own post (allowed by business rules)
  const report = await generate_random_reddit_community_member_reports_create(
    memberLoginConnection,
    {
      body: {
        postId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "report reporter should be member",
    report.reporter.id,
    memberResponse.id,
  );
  TestValidator.equals(
    "report target should be the created post",
    report.target.id,
    post.id,
  );
  // 6. Community owner logs in to dismiss the report
  const communityOwnerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_community_owner_login(communityOwnerLoginConnection, {
    body: {
      email: communityOwnerResponse.email!,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 7. Community owner dismisses the report
  const dismissedReport =
    await api.functional.redditCommunity.communityOwner.reports.dismiss(
      communityOwnerLoginConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // 8. Validate dismissal results
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "report resolver should be community owner",
    dismissedReport.resolved_by_user?.id,
    communityOwnerResponse.id,
  );
  TestValidator.equals(
    "report reporter should remain member",
    dismissedReport.reporter.id,
    memberResponse.id,
  );
  TestValidator.equals(
    "report target should still be the same post",
    dismissedReport.target.id,
    post.id,
  );
  TestValidator.notEquals(
    "report updated_at should be different from created_at",
    dismissedReport.updated_at,
    dismissedReport.created_at,
  );
  // 9. Verify post is still accessible (content not deleted)
  const postAfterDismissal =
    await api.functional.redditCommunity.member.posts.create(
      communityOwnerLoginConnection,
      {
        body: {
          community_id: post.community.id,
          title: "Test post after dismissal",
          content: "This post exists after report dismissal",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(postAfterDismissal);
}
