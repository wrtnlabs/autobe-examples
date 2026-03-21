import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the popular feed with default hot sorting algorithm.
 *
 * Validates:
 * 1. Unauthenticated guests can access the popular feed without authentication
 * 2. Response includes paginated post summaries with essential display fields
 * 3. Pagination metadata includes current page, total records, total pages, and limit
 */
export async function test_api_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session (required dependency per scenario plan)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Call popular feed with default hot sorting (public endpoint)
  const popularFeed =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          sort: "hot",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(popularFeed);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    popularFeed.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is valid",
    popularFeed.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "limit is valid",
    popularFeed.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "records count is valid",
    popularFeed.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    popularFeed.pagination.pages >= 0,
    true,
  );
  // 4. Validate post summary structure if posts exist
  for (const post of popularFeed.data) {
    TestValidator.equals("post has id", post.id !== null, true);
    TestValidator.equals("post has title", post.title !== null, true);
    TestValidator.equals("post has type", post.type !== null, true);
    TestValidator.equals(
      "post has vote_score",
      typeof post.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count === "number",
      true,
    );
    TestValidator.equals("post has created_at", post.created_at !== null, true);
    TestValidator.equals("post has author", post.author !== null, true);
    TestValidator.equals(
      "author has username",
      post.author.username !== null,
      true,
    );
    TestValidator.equals("post has community", post.community !== null, true);
    TestValidator.equals(
      "community has name",
      post.community.name !== null,
      true,
    );
  }
}
