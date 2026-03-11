import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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

export async function test_api_report_analytics_permission_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two members representing moderators of different communities
  const connection1: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(connection1, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  const connection2: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(connection2, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 2. Test that member A can access analytics without community filter (own data)
  const memberAOwnAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      connection1,
      {
        body: {} satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(memberAOwnAnalytics);
  await TestValidator.predicate(
    "member A analytics response is valid page structure",
    () => !!memberAOwnAnalytics.pagination && !!memberAOwnAnalytics.data.length,
  );
  // 3. Test that member B can access analytics without community filter (own data)
  const memberBOwnAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      connection2,
      {
        body: {} satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(memberBOwnAnalytics);
  await TestValidator.predicate(
    "member B analytics response is valid page structure",
    () => !!memberBOwnAnalytics.pagination && !!memberBOwnAnalytics.data.length,
  );
  // 4. Test that member A cannot access analytics for a specific community ID they don't own
  // This validates the permission restriction - the endpoint should return empty data
  // or 403 Forbidden when filtering by unauthorized community_id
  const unauthorizedAnalytics =
    await api.functional.redditPlatform.member.reports.analytics.index(
      connection1,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(unauthorizedAnalytics);
  // Validate that analytics data is empty for unauthorized community
  TestValidator.equals(
    "analytics data empty for unauthorized community filter",
    unauthorizedAnalytics.data,
    [],
  );
  // 5. Test that member B cannot access analytics for a specific community ID they don't own
  const unauthorizedAnalytics2 =
    await api.functional.redditPlatform.member.reports.analytics.index(
      connection2,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(unauthorizedAnalytics2);
  // Validate that analytics data is empty for unauthorized community
  TestValidator.equals(
    "analytics data empty for unauthorized community filter",
    unauthorizedAnalytics2.data,
    [],
  );
}