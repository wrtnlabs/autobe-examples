import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_views_track_view } from "../../../generate/generate_random_reddit_platform_views_track_view";
import { prepare_random_reddit_platform_feed_view } from "../../../prepare/prepare_random_reddit_platform_feed_view";

/**
 * Test authenticated member home feed view tracking workflow.
 * 1. Member joins platform and establishes authenticated session
 * 2. Member triggers home feed view tracking
 * 3. System records view event with user context and engagement metrics
 */
export async function test_api_member_home_feed_view_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with authorized session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection for view tracking
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Generate and record home feed view tracking
  const view = await generate_random_reddit_platform_views_track_view(
    authConnection,
    {
      body: {
        feed_type: "home",
        user_id: member.id,
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0",
        ip_address: "192.168.1.1",
        engagement_duration: typia.random<number>(),
        items_viewed: typia.random<number>(),
      },
    },
  );
  typia.assert(view);
  // 4. Validate feed view record
  TestValidator.equals("user_id matches member", view.userId, member.id);
  TestValidator.equals("feed_type is home", view.feedType, "home");
  TestValidator.predicate("has valid user agent", view.userAgent !== null);
  TestValidator.predicate("has valid IP address", view.ipAddress !== null);
  TestValidator.predicate(
    "engagement duration recorded",
    view.engagementDuration !== null,
  );
  TestValidator.predicate("items viewed recorded", view.itemsViewed !== null);
  TestValidator.predicate("viewedAt timestamp exists", view.viewedAt !== null);
}
