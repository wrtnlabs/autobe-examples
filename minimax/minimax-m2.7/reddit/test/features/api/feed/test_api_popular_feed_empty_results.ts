import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member with no activity
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request the popular feed (public endpoint, accessible to authenticated users)
  const feed = await api.functional.redditClone.member.feed.popular.index(
    memberConnection,
    {
      body: {} satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Validate response returns empty data array when no posts exist
  TestValidator.equals("data array should be empty", feed.data, []);
  // 4. Verify pagination shows records=0 and pages=0
  TestValidator.equals(
    "pagination records should be 0",
    feed.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    feed.pagination.pages,
    0,
  );
  // 5. Confirm no error is thrown - empty feed is valid state
  // (Already validated by successful API call with typia.assert)
  // 6. Test pagination with page number beyond available results returns empty
  const paginatedFeed =
    await api.functional.redditClone.member.feed.popular.index(
      memberConnection,
      {
        body: {
          page: 2,
        } satisfies IRedditClonePost.IRequest,
      },
    );
  typia.assert(paginatedFeed);
  // Verify empty results for page beyond available data
  TestValidator.equals(
    "page 2 should also return empty data",
    paginatedFeed.data,
    [],
  );
}
