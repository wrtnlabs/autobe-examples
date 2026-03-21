import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving the home feed when user has no subscriptions.
 *
 * Validates that:
 * 1. A newly registered member can authenticate
 * 2. The home feed returns empty results when user has no subscriptions
 * 3. Pagination metadata correctly shows 0 total records
 */
export async function test_api_home_feed_empty_without_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member (with no subscriptions)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve home feed without any subscriptions
  const homeFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 3. Validate empty data array
  TestValidator.equals(
    "home feed data should be empty",
    homeFeed.data.length,
    0,
  );
  // 4. Validate pagination shows 0 records
  TestValidator.equals(
    "pagination records should be 0",
    homeFeed.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    homeFeed.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    homeFeed.pagination.current,
    1,
  );
}
