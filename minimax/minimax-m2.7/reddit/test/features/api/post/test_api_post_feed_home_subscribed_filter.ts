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

export async function test_api_post_feed_home_subscribed_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Validate authorization response
  typia.assert(authorized);
  // 2. Fetch home feed with subscribedOnly filter
  // This endpoint returns posts only from communities the authenticated user has subscribed to
  const homeFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        subscribedOnly: true,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  // Validate response structure with typia.assert()
  typia.assert(homeFeed);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    homeFeed.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive when records exist",
    homeFeed.pagination.records === 0 || homeFeed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    homeFeed.pagination.pages >= 0,
  );
  // 4. Validate data is array
  TestValidator.predicate("data is array", Array.isArray(homeFeed.data));
  // 5. If there are posts, validate post structure completeness
  for (const post of homeFeed.data) {
    // Each post must have required summary fields validated by typia.assert above
    TestValidator.predicate("post has id", !!post.id);
    TestValidator.predicate("post has title", !!post.title);
    TestValidator.predicate(
      "post has valid type",
      ["text", "link", "image"].includes(post.type),
    );
    TestValidator.predicate("post has author id", !!post.author?.id);
    TestValidator.predicate("post has community id", !!post.community?.id);
  }
}
