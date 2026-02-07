import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Verify popular feed sorts by hot ranking (upvotes + (age * 0.5)) descending.
 * An existing older post with 20 upvotes should appear before a newer post with 10 upvotes.
 * Note: This test assumes test data with posts having 20 upvotes (older) and 10 upvotes (newer).
 */
export async function test_api_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection with authorization
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {},
  });
  // Get popular feed
  const feed =
    await api.functional.communityPlatform.guest.feed.popular.index(
      guestConnection,
    );
  typia.assert(feed);
  // Find a post with 20 upvotes (older) and with 10 upvotes (newer)
  const olderPost = feed.data.find((post) => post.votes === 20);
  const newerPost = feed.data.find((post) => post.votes === 10);
  // Verify both posts were found
  if (!olderPost || !newerPost) {
    throw new Error(
      "Test data not found for posts (20 upvotes and 10 upvotes)",
    );
  }
  // Verify that the older post (with 20 upvotes) appears before the newer post (with 10 upvotes)
  const olderIndex = feed.data.indexOf(olderPost);
  const newerIndex = feed.data.indexOf(newerPost);
  TestValidator.predicate(
    "popular feed sorted by hot rank descending",
    olderIndex < newerIndex,
  );
}
