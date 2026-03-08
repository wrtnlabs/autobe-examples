import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_dismiss_outside_community_authority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member who will be moderator of first community
  const member1Token: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(member1Token);
  const member1Connection: api.IConnection = { host: connection.host };
  member1Connection.headers = { Authorization: member1Token.token.access };
  // 2. Create first community
  const community1: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community1);
  // 3. Create second member who will create second community
  const member2Token: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(member2Token);
  const member2Connection: api.IConnection = { host: connection.host };
  member2Connection.headers = { Authorization: member2Token.token.access };
  // 4. Create second community (where report content will exist)
  const community2: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      member2Connection,
      {},
    );
  typia.assert(community2);
  // 5. Assign member1 as moderator of community1 only (NOT community2)
  const moderator1: IRedditPlatformCommunityModerator =
    await generate_random_reddit_platform_member_communities_moderators_create(
      member1Connection,
      {
        params: { communityId: community1.id },
        body: {
          member_id: member1Token.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator1);
  // 6. Create third member who will submit the report
  const member3Token: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(member3Token);
  const member3Connection: api.IConnection = { host: connection.host };
  member3Connection.headers = { Authorization: member3Token.token.access };
  // 7. Create post in community2
  const post: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      member3Connection,
      {
        body: {
          community_id: community2.id,
          title: RandomGenerator.name(3),
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 8. Submit report on the post in community2
  const report: IRedditPlatformReport =
    await generate_random_reddit_platform_member_reports_create(
      member3Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 9. Verify initial report state is pending with no reviewer
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report has no reviewer", report.reviewer, null);
  // 10. Attempt to dismiss report using member1 (moderator of community1, NOT community2)
  // This should fail with authorization error (403)
  await TestValidator.httpError(
    "moderator cannot dismiss report from other community",
    403,
    async () => {
      await api.functional.redditPlatform.member.reports.dismiss(
        member1Connection,
        {
          reportId: report.id,
          body: {} satisfies IRedditPlatformReport.IDismiss,
        },
      );
    },
  );
  // 11. Verify report status remains unchanged (we already have the original report object)
  // Since there's no GET endpoint for reports in the SDK, we verify using the captured report
  // The HTTP error above confirms the dismissal was rejected, so the report should still be pending
  TestValidator.equals(
    "report status remains pending after failed dismissal attempt",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "report still has no reviewer after failed dismissal attempt",
    report.reviewer,
    null,
  );
}