import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalPost";

/**
 * Validate private community post access control (rewritten to use available
 * SDK operations).
 *
 * Because the SDK does not provide a GET listing function for community posts,
 * this test verifies access control by ensuring unauthenticated callers cannot
 * interact with member-only subscription APIs and that authenticated,
 * subscribed members can create subscriptions and posts in private
 * communities.
 *
 * Steps:
 *
 * 1. Register a new member (auth.member.join)
 * 2. Create a private community (communityPortal.member.communities.create)
 * 3. Create a text post inside the private community
 *    (communityPortal.member.posts.create)
 * 4. Attempt to subscribe to the private community unauthenticated -> expect an
 *    error
 * 5. Subscribe to the private community as the authenticated member -> expect
 *    success
 * 6. Validate that the created post references the private community and that the
 *    subscription references the community too.
 */
export async function test_api_community_posts_private_access_control(
  connection: api.IConnection,
) {
  // 1) Member registration
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a private community
  const communityBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(6),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  TestValidator.predicate(
    "community is private",
    community.is_private === true,
  );

  // 3) Create a text post in the private community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate.IText;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post belongs to created community",
    post.community_id,
    community.id,
  );

  // 4) Attempt subscription creation unauthenticated → expect an error
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller cannot subscribe to private community",
    async () => {
      await api.functional.communityPortal.member.communities.subscriptions.create(
        unauthConn,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
          } satisfies ICommunityPortalSubscription.ICreate,
        },
      );
    },
  );

  // 5) Subscribe as authenticated member → expect success
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

  TestValidator.equals(
    "subscription references community",
    subscription.community_id,
    community.id,
  );

  // 6) Additional consistency checks
  TestValidator.predicate(
    "post id exists",
    typeof post.id === "string" && post.id.length > 0,
  );
  TestValidator.predicate(
    "subscription id exists",
    typeof subscription.id === "string" && subscription.id.length > 0,
  );
}
