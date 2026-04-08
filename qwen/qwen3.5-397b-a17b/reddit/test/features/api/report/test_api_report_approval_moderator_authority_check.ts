import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test report approval moderator authority check.
 *
 * Validates that only moderators of the community where content was posted can approve reports against that content. This test ensures the system properly checks the reddit_community_moderators table before allowing report resolution actions.
 *
 * The test creates two member accounts: one who owns a community (and is automatically a moderator) and one who is a regular member with no moderator privileges. A post is created in the community, a report is filed against it, and then the non-moderator member attempts to approve the report. This attempt must be rejected to verify proper access control.
 *
 * 1. Create moderator member account and authenticate.
 * 2. Create community owned by the moderator member.
 * 3. Create regular member account (non-moderator) and authenticate.
 * 4. Create a post in the community using the moderator connection.
 * 5. Create a report against the post using the regular member connection.
 * 6. Attempt to approve the report as the non-moderator member - should fail with error.
 */
export async function test_api_report_approval_moderator_authority_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create community owned by moderator
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create regular member account (non-moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 4. Create a post in the community
  const post = await generate_random_reddit_community_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Create a report against the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "post",
        target_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 6. Attempt to approve report as non-moderator - should fail
  await TestValidator.error("non-moderator cannot approve report", async () => {
    await api.functional.redditCommunity.member.reports.approve(
      memberConnection,
      {
        reportId: report.id,
      },
    );
  });
}
