import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_dismissal_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: Non-moderator member attempts to dismiss a report and receives authorization error.
  //
  // Setup: Create a community owner (who is automatically a moderator). Create a regular member
  // (non-moderator). Create a post by a third member in the community. Submit a report against the post.
  //
  // Test Execution: Call POST /redditClone/member/reports/{reportId}/dismiss using the regular
  // member's authentication token (not the moderator).
  //
  // Validation:
  // 1. Response status should be 403 Forbidden
  // 2. Response should indicate the user does not have permission to dismiss reports
  // 3. The report should remain in 'pending' status
  // 4. The reported content should remain unchanged
  // 1. Create community owner (who is automatically a moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  const ownerMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${owner.token.access}` },
  };
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerMemberConnection,
      {},
    );
  // 2. Create regular member (non-moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  const regularMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member.token.access}` },
  };
  // 3. Create a third member who will post content
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {});
  const thirdMemberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${thirdMember.token.access}` },
  };
  // 4. Create a post by the third member in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    thirdMemberAuthConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  // 5. Submit a report against the post (using owner/moderator to report)
  const report = await generate_random_reddit_clone_member_reports_create(
    ownerMemberConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(report);
  // Verify report status is pending
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  // 6. Attempt to dismiss the report using regular member (non-moderator)
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-moderator should not be able to dismiss report",
    403,
    async () =>
      await api.functional.redditClone.member.reports.dismiss(
        regularMemberConnection,
        {
          reportId: report.id,
          body: {
            status: "dismissed",
          },
        },
      ),
  );
}
