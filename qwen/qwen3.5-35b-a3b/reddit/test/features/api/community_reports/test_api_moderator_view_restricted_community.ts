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

export async function test_api_moderator_view_restricted_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (community owner who will moderate)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "member_a_" + RandomGenerator.alphaNumeric(6),
      href: "http://test.local/register",
      referrer: "http://test.local",
    },
  });
  typia.assert(memberA);
  // 2. Register Member B (non-moderator who will attempt unauthorized access)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "member_b_" + RandomGenerator.alphaNumeric(6),
      href: "http://test.local/register",
      referrer: "http://test.local",
    },
  });
  typia.assert(memberB);
  // 3. Member A creates a community called "restricted-community"
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: "restricted-community",
          description: "Test community for access control verification",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member B creates a post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        community_id: community.id,
        title: "Test post for report scenario",
        post_type: "text",
        text_content: "This is a test post that will be reported",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A (community owner) submits a report against the post
  const report = await api.functional.redditPlatform.member.reports.create(
    memberAConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason:
          "This is a test report for verifying access control on reports endpoint",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Member B (non-moderator) attempts to access reports for the community
  // This should return 403 Forbidden
  await TestValidator.error(
    "non-moderator cannot access community reports",
    async () => {
      await api.functional.redditPlatform.member.communities.reports.index(
        memberBConnection,
        {
          communityName: community.name,
          body: {},
        },
      );
    },
  );
}
