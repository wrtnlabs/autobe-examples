import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { IEPostSortMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPostSortMode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalPost";

export async function test_api_community_posts_private_requires_subscription(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that a private (invite-only) community enforces
   * visibility gating and that subscribing a member grants access to list
   * posts. Also validate pagination/sort request handling on the listing
   * endpoint.
   *
   * Steps:
   *
   * 1. Register a new member and assert authorization object
   * 2. Create a private community (is_private = true)
   * 3. Create multiple text posts in that community
   * 4. Attempt to list posts using an unauthenticated connection and assert an
   *    error is thrown (access denied behavior)
   * 5. Subscribe the authenticated member to the community
   * 6. Retry listing posts as the subscribed member and assert the page and
   *    business rules (posts visible, belong to community, pagination)
   */

  // 1) Register new member (will set connection.headers.Authorization automatically)
  const memberBody = {
    username: `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(3)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd!",
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a private community
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: `${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Create two text posts in the private community
  const postBody1 = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPortalPost.ICreate.IText;

  const post1: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody1,
    });
  typia.assert(post1);

  const postBody2 = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate.IText;

  const post2: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody2,
    });
  typia.assert(post2);

  // 4) Attempt to list posts from an unauthenticated context → expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "private community list should be forbidden to unauthenticated users",
    async () => {
      await api.functional.communityPortal.communities.posts.index(unauthConn, {
        communityId: community.id,
        body: {
          communityId: community.id,
          limit: 10,
        } satisfies ICommunityPortalPost.IRequest,
      });
    },
  );

  // 5) Subscribe the caller to the community
  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 6) Retry listing posts as subscribed member and assert results
  const page: IPageICommunityPortalPost.ISummary =
    await api.functional.communityPortal.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        communityId: community.id,
        sort: "new" as IEPostSortMode,
        limit: 10,
        offset: 0,
      } satisfies ICommunityPortalPost.IRequest,
    });
  typia.assert(page);

  // Business validations
  await TestValidator.predicate(
    "posts visible after subscription",
    page.data.length > 0,
  );

  TestValidator.predicate(
    "all returned posts belong to the requested community",
    page.data.every((p) => p.community_id === community.id),
  );

  TestValidator.equals(
    "pagination limit matches requested value",
    page.pagination.limit,
    10,
  );
}
