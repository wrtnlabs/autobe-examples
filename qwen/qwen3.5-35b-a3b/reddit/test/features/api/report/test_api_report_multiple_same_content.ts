import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_report_multiple_same_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member A and create community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(10) +
            "_" +
            RandomGenerator.alphaNumeric(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Create post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(5),
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Join member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  // 4. Join member C
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberCAuth);
  // 5. Member B reports the post
  const reportB = await api.functional.redditPlatform.member.reports.create(
    memberBConnection,
    {
      body: {
        target_id: post.id,
        target_type: "post" as const,
        reason:
          "This post violates community guidelines - reason from member B",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(reportB);
  // 6. Member C reports the same post
  const reportC = await api.functional.redditPlatform.member.reports.create(
    memberCConnection,
    {
      body: {
        target_id: post.id,
        target_type: "post" as const,
        reason: "Different violation reason from member C for same content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(reportC);
  // 7. Validate both reports exist and are independent
  TestValidator.equals("report B status is pending", reportB.status, "pending");
  TestValidator.equals("report C status is pending", reportC.status, "pending");
  // Different reported_by (different sessions)
  TestValidator.notEquals(
    "report B and report C have different reporters",
    reportB.reported_by.id,
    reportC.reported_by.id,
  );
  // Different reasons
  TestValidator.equals(
    "report B reason matches input",
    reportB.reason,
    "This post violates community guidelines - reason from member B",
  );
  TestValidator.equals(
    "report C reason matches input",
    reportC.reason,
    "Different violation reason from member C for same content",
  );
  // Same target type (both report posts)
  TestValidator.equals(
    "both reports target same content type",
    reportB.target_type,
    reportC.target_type,
  );
  // Same community
  TestValidator.equals(
    "both reports in same community",
    reportB.community.id,
    reportC.community.id,
  );
  // Different timestamps
  TestValidator.notEquals(
    "reports have different created_at timestamps",
    reportB.created_at,
    reportC.created_at,
  );
}
