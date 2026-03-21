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

export async function test_api_popular_feed_pagination_and_type_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access the popular feed endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test default pagination (limit=20, page=1)
  const defaultFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {} satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(defaultFeed);
  // Validate default pagination metadata
  TestValidator.equals(
    "default page should be 1",
    defaultFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultFeed.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should be non-negative",
    defaultFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    defaultFeed.pagination.pages >= 0,
  );
  // 3. Test custom limit (5 posts per page)
  const smallLimitFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(smallLimitFeed);
  TestValidator.equals(
    "small limit should be 5",
    smallLimitFeed.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(smallLimitFeed.data),
  );
  // 4. Test pagination navigation (page 2)
  const pageTwoFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(pageTwoFeed);
  TestValidator.equals(
    "page 2 should show current as 2",
    pageTwoFeed.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 should have limit of 10",
    pageTwoFeed.pagination.limit,
    10,
  );
  // 5. Test post type filtering - filter by 'text'
  const textPostsFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
          postType: "text",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(textPostsFeed);
  // Verify all returned posts are text type (if there are posts)
  if (textPostsFeed.data.length > 0) {
    const allTextPosts = textPostsFeed.data.every(
      (post) => post.type === "text",
    );
    TestValidator.predicate(
      "all posts should be text type when filtered",
      allTextPosts,
    );
  }
  // 6. Test post type filtering - filter by 'link'
  const linkPostsFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
          postType: "link",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(linkPostsFeed);
  // Verify all returned posts are link type (if there are posts)
  if (linkPostsFeed.data.length > 0) {
    const allLinkPosts = linkPostsFeed.data.every(
      (post) => post.type === "link",
    );
    TestValidator.predicate(
      "all posts should be link type when filtered",
      allLinkPosts,
    );
  }
  // 7. Test post type filtering - filter by 'image'
  const imagePostsFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
          postType: "image",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(imagePostsFeed);
  // Verify all returned posts are image type (if there are posts)
  if (imagePostsFeed.data.length > 0) {
    const allImagePosts = imagePostsFeed.data.every(
      (post) => post.type === "image",
    );
    TestValidator.predicate(
      "all posts should be image type when filtered",
      allImagePosts,
    );
  }
  // 8. Test without filter - should return all post types
  const allTypesFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(allTypesFeed);
  // When no filter is applied, data can contain mixed types
  const hasMixedOrEmptyData =
    allTypesFeed.data.length === 0 ||
    allTypesFeed.data.some(
      (post) =>
        post.type === "text" || post.type === "link" || post.type === "image",
    );
  TestValidator.predicate(
    "all types feed should have data with valid types",
    hasMixedOrEmptyData,
  );
  // 9. Test max limit boundary (100)
  const maxLimitFeed =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(maxLimitFeed);
  TestValidator.equals(
    "max limit should be 100",
    maxLimitFeed.pagination.limit,
    100,
  );
  // 10. Validate pagination calculation - total pages should be ceil(records/limit)
  if (defaultFeed.pagination.records > 0) {
    const expectedPages = Math.ceil(
      defaultFeed.pagination.records / defaultFeed.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation should be correct",
      defaultFeed.pagination.pages,
      expectedPages,
    );
  }
}
