import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate basic setup for top posts feed visibility in public communities.
 *
 * Business goal (original scenario):
 *
 * - Ensure that a public top posts feed would surface posts from visible
 *   communities, be publicly accessible to guests, and expose correct
 *   pagination and summary data.
 *
 * Practical implementation constraints:
 *
 * - The SDK functions provided only cover:
 *
 *   - POST /auth/memberUser/join
 *   - POST /communityPlatform/memberUser/communities
 *   - POST /communityPlatform/memberUser/posts
 * - There is no generated SDK for GET /communityPlatform/feeds/posts/top.
 *
 * Therefore this E2E test focuses on the fully verifiable part of the workflow:
 *
 * 1. Register a new member user (join) and obtain an authenticated session.
 * 2. Create a public, non-quarantined, non-restricted community.
 * 3. Create multiple posts in that community as the authenticated member.
 * 4. Assert types of all created entities using typia.assert.
 * 5. Build a guest connection (no headers) that would be used for a public
 *    top-feed call, without actually invoking a non-existent SDK function.
 *
 * This keeps the test fully compilable and type-safe while preparing realistic
 * data that a top posts feed implementation would later consume.
 */
export async function test_api_top_posts_feed_basic_visibility(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join to establish an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a public, visible community owned by this member user.
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Sanity checks on created community vs input DTO.
  TestValidator.equals(
    "community slug should match requested slug",
    community.slug,
    communityBody.slug,
  );
  TestValidator.equals(
    "community name should match requested name",
    community.name,
    communityBody.name,
  );
  TestValidator.predicate(
    "community should be marked as public visibility",
    community.visibility === "public",
  );
  TestValidator.predicate(
    "community should not be quarantined",
    community.is_quarantined === false,
  );

  // 3. Create multiple posts in that community as the authenticated member.
  const postCount = 5;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async () => {
      const postBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 10 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: postBody },
        );
      typia.assert(post);

      // Basic invariants between request and response.
      TestValidator.equals(
        "post community_id should match created community id",
        post.community_id,
        community.id,
      );
      TestValidator.equals(
        "post title should match requested title",
        post.title,
        postBody.title,
      );
      TestValidator.predicate(
        "post author_memberuser_id should equal joined member id",
        post.author_memberuser_id === member.id,
      );

      return post;
    },
  );

  TestValidator.equals(
    "number of created posts should equal requested count",
    createdPosts.length,
    postCount,
  );

  // 4. Prepare a guest (unauthenticated) connection that would be used
  // for a public top-feed GET call, without touching the original
  // authenticated connection's headers.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  typia.assert<api.IConnection>(guestConnection);

  // NOTE: We intentionally do NOT call any non-existent
  // api.functional.communityPlatform.feeds.posts.top function here.
  // When such SDK is available, this section would:
  // - Invoke the top posts feed with guestConnection
  // - Assert that the returned page matches IPageICommunityPlatformPost.ISummary
  // - Verify that createdPosts appear in the feed and that their
  //   summary fields (community, author, title, engagement counters)
  //   satisfy the documented invariants.
}
