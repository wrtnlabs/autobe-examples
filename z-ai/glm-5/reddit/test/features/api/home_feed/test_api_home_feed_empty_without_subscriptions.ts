import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member with no active subscriptions receives an empty home feed.
 *
 * A newly registered member with no community subscriptions should receive
 * an empty home feed with pagination metadata indicating zero records and pages.
 */
export async function test_api_home_feed_empty_without_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member account with no subscriptions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Call the home feed endpoint
  const feed =
    await api.functional.communityPlatform.member.home.feed(memberConnection);
  typia.assert(feed);
  // Verify the feed returns an empty result set
  TestValidator.equals("data should be empty", feed.data.length, 0);
  // Verify pagination metadata for empty state
  TestValidator.equals("records should be 0", feed.pagination.records, 0);
  TestValidator.equals("pages should be 0", feed.pagination.pages, 0);
  // Verify pagination fields are properly set
  TestValidator.predicate("current page is set", feed.pagination.current >= 1);
  TestValidator.predicate("limit is set", feed.pagination.limit >= 1);
}
