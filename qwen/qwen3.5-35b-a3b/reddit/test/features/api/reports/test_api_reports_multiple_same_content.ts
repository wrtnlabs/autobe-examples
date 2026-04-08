import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_reports_multiple_same_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "member1_" + RandomGenerator.alphaNumeric(6),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(member1Auth);
  // 2. Create second member and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "member2_" + RandomGenerator.alphaNumeric(6),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(member2Auth);
  // 3. Create a community (owned by member1)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: "test_community_" + RandomGenerator.alphaNumeric(8),
          description: "Test community for multiple reports",
        },
      },
    );
  typia.assert(community);
  // 4. Both members subscribe to the community
  await api.functional.redditPlatform.member.communities.subscribe(
    member1Connection,
    { communityName: community.name },
  );
  await api.functional.redditPlatform.member.communities.subscribe(
    member2Connection,
    { communityName: community.name },
  );
  // 5. First member creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: "Test Post for Multiple Reports",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. First member submits a report on the post
  const report1 = await generate_random_reddit_platform_member_reports_create(
    member1Connection,
    {
      body: {
        target_id: post.id,
        target_type: "post",
        reason:
          "This post violates community guidelines - reason from member 1",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // 7. Second member submits a report on the SAME post with different reason
  const report2 = await generate_random_reddit_platform_member_reports_create(
    member2Connection,
    {
      body: {
        target_id: post.id,
        target_type: "post",
        reason:
          "This post violates community guidelines - reason from member 2",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // 8. Authenticate as moderator and query reports list
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "moderator_" + RandomGenerator.alphaNumeric(6),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    },
  });
  // Subscribe moderator to community
  await api.functional.redditPlatform.member.communities.subscribe(
    moderatorConnection,
    { communityName: community.name },
  );
  // Query reports with status filter
  const reportsPage = await api.functional.redditPlatform.member.reports.index(
    moderatorConnection,
    {
      body: typia.assert<IRedditPlatformReport.IRequest>({
        status: "pending",
        limit: 50,
      }),
    },
  );
  typia.assert(reportsPage);
  // 9. Validation
  // Extract reports
  const reports = reportsPage.data;
  // Find both reports by their IDs
  const foundReport1 = reports.find((r) => r.id === report1.id);
  const foundReport2 = reports.find((r) => r.id === report2.id);
  // Validate both reports exist in the list
  TestValidator.predicate("report1 exists in list", foundReport1 !== undefined);
  TestValidator.predicate("report2 exists in list", foundReport2 !== undefined);
  // Verify both reports have same target_id (the post)
  TestValidator.equals(
    "both reports target same post",
    foundReport1!.target_id,
    foundReport2!.target_id,
  );
  TestValidator.equals(
    "target_id matches reported post",
    foundReport1!.target_id,
    post.id,
  );
  // Verify different reporters (different member IDs)
  TestValidator.notEquals(
    "report1 has different reporter than report2",
    foundReport1!.reported_by.id,
    foundReport2!.reported_by.id,
  );
  // Verify different reasons
  TestValidator.notEquals(
    "report1 and report2 have different reason texts",
    foundReport1!.reason,
    foundReport2!.reason,
  );
  // Verify reporter usernames are different
  TestValidator.notEquals(
    "report1 and report2 have different reporter usernames",
    foundReport1!.reported_by.username,
    foundReport2!.reported_by.username,
  );
  // Verify both reports are for the same community
  TestValidator.equals(
    "both reports belong to same community",
    foundReport1!.community.id,
    foundReport2!.community.id,
  );
  TestValidator.equals(
    "community matches created community",
    foundReport1!.community.id,
    community.id,
  );
}
