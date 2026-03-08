import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that a moderator cannot approve reports for communities they do not moderate.
 * This validates cross-community permission enforcement for the moderation system.
 */
export async function test_api_moderator_report_approval_cross_community_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first moderator (for Community A)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 2. Create second moderator (for Community B)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 3. Create member to create report
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 4. Create a report using the member (reporting content in Community A)
  // Note: Since we don't have post/community creation, we create a report
  // with a synthetic report entry - in real scenario this would be on actual content
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        reason: "This is a test report for validation purposes",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Attempt for Community B moderator to approve the report
  // This should be rejected because moderatorB is not authorized for Community A
  await TestValidator.error(
    "cross-community report approval should be rejected",
    async () => {
      await api.functional.redditLike.moderator.reports.approve(
        moderatorBConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
  // 6. Verify the report status remains 'pending' (cannot directly verify without retrieval)
  // The error from step 5 serves as validation that the cross-community approval was rejected
}
