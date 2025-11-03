import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_post_detail_unpublished_author_view(
  connection: api.IConnection,
) {
  // Validate that unpublished/pending posts are invisible to the public but
  // visible to the post author. Steps:
  // 1) Create author (alice) via join
  // 2) Create community as alice
  // 3) Create post in community as alice
  // 4) Update post to unpublished/pending_moderation
  // 5) Verify unauthenticated client cannot access the post (error)
  // 6) Verify author can access the post (200 + post details)

  // Unique suffix to avoid collisions
  const unique = Date.now();

  // 1) Author signup (alice)
  const aliceEmail = `alice.${unique}@example.test`;
  const aliceUsername = `alice_${RandomGenerator.alphaNumeric(6)}`;
  const aliceJoinBody = {
    email: aliceEmail,
    username: aliceUsername,
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const aliceAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: aliceJoinBody,
    });
  typia.assert(aliceAuth);

  // 2) Create community as alice
  const communitySlug = `test-community-${unique}`;
  const communityBody = {
    name: `Test Community ${unique}`,
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    post_approval_required: true,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create post in the community as alice
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      { communitySlug, body: postCreateBody },
    );
  typia.assert(post);

  // 4) Update the post to unpublished / pending moderation
  const updateBody = {
    is_published: false,
    business_status: "pending_moderation",
  } satisfies ICommunityBbsPost.IUpdate;

  const updated: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5) As an unauthenticated client, attempt to GET the post and expect an error
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "public cannot access unpublished post",
    async () => {
      await api.functional.communityBbs.posts.at(unauthConn, {
        postId: post.id,
      });
    },
  );

  // 6) As the author (alice) retrieve the post and assert details are visible
  const read: ICommunityBbsPost = await api.functional.communityBbs.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(read);

  TestValidator.equals(
    "author can access unpublished post id",
    read.id,
    post.id,
  );
  TestValidator.equals(
    "author id matches owner",
    read.author.id,
    aliceAuth.member.id,
  );
}
