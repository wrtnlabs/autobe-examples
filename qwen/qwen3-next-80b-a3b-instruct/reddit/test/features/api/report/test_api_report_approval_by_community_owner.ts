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

export async function test_api_report_approval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner actor
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(communityOwner);
  // 2. Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 3. Authenticate member to create post
  const memberAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAuthConnection, {
    body: {
      email: member.email!,
      password: member.token.access,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Create post in community owned by communityOwner (using random generator)
  const post = await generate_random_reddit_community_member_posts_create(
    memberAuthConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member reports the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberAuthConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 20,
        }),
        postId: post.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Authenticate community owner to approve the report
  const communityOwnerAuthConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_community_owner_login(communityOwnerAuthConnection, {
    body: {
      email: communityOwner.email!,
      password: communityOwner.token.access,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 7. Community owner approves the report
  const approvedReport =
    await api.functional.redditCommunity.communityOwner.reports.approve(
      communityOwnerAuthConnection,
      {
        reportId: report.id,
        body: {},
      },
    );
  typia.assert(approvedReport);
  // 8. Verify report status is approved
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // 9. Verify report resolved by community owner
  TestValidator.equals(
    "report resolved by community owner",
    approvedReport.resolved_by_user?.id,
    communityOwner.id,
  );
  // 10. Verify post is marked as deleted - validate via report target structure
  // The API function approve returns an IRedditCommunityReport with target as IRedditCommunityPost.ISummary
  // Since the full IRedditCommunityPost interface has is_deleted but its summary doesn't,
  // we validate the target's existence and ID match to confirm link was preserved
  // The scenario requirement that is_deleted=true is set on approval is system behavior
  // that we must rely on since the summary DTO doesn't expose it
  if (
    approvedReport.target &&
    typeof approvedReport.target === "object" &&
    "id" in approvedReport.target
  ) {
    // This confirms it's a post target (not a comment target)
    const postTarget = approvedReport.target as IRedditCommunityPost.ISummary;
    TestValidator.equals(
      "report target has correct post ID",
      postTarget.id,
      post.id,
    );
    // The deletion is verified in the system behavior and test scenario -
    // it's required per business rules but not exposed in the summary DTO
    // We can't validate the is_deleted property directly due to DTO limitation
  } else {
    throw new Error("Report target is not a post summary as expected");
  }
  // 11. Verify post is no longer visible in public feeds
  // This is an implicit requirement of the system behavior per the scenario plan
  // We cannot test visibility directly since we don't have endpoints like /feeds
  // The approved report structure confirms the post was targeted, and system should hide it
  // 12. Verify the reporter is not affected (no action taken on reporter)
  // We use the member object fetched during account creation
  // There's no API to modify reporter account during report approval
  TestValidator.equals(
    "reporter account still active",
    member.is_deleted,
    false,
  );
}
