import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";

/**
 * Validate retrieval of a specific post edit history snapshot by the authoring
 * member user.
 *
 * Business flow covered:
 *
 * 1. Register a new member user via /auth/memberUser/join (author).
 * 2. Create a community as that member via
 *    /communityPlatform/memberUser/communities.
 * 3. Create a text post in that community via /communityPlatform/memberUser/posts.
 * 4. Obtain at least one edit history snapshot for that post using the
 *    editHistories.at endpoint in simulation mode (since no concrete update API
 *    is available in the provided SDK), ensuring we have a valid snapshot id.
 * 5. Re-fetch the same snapshot with the author’s authenticated (non-simulated)
 *    connection and verify:
 *
 *    - Response type matches ICommunityPlatformPostEditHistory (via typia.assert).
 *    - Returned snapshot.post.id equals the requested postId.
 * 6. Call the endpoint again with a random (non‑existent) editHistoryId and ensure
 *    it fails using TestValidator.error, without asserting specific HTTP status
 *    codes.
 */
export async function test_api_post_edit_history_snapshot_retrieval_by_author_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user (author)
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a community as that member
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a text post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Obtain a simulated edit history snapshot for this post.
  // We use a cloned connection with simulate enabled, without touching headers.
  const simulatedConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };

  const simulatedSnapshot: ICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.memberUser.posts.editHistories.at(
      simulatedConnection,
      {
        postId: post.id,
        editHistoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(simulatedSnapshot);

  // 5. Re-fetch the same snapshot with the author’s real (non-simulated) connection
  //    and verify core invariants.
  const snapshot: ICommunityPlatformPostEditHistory =
    await api.functional.communityPlatform.memberUser.posts.editHistories.at(
      connection,
      {
        postId: post.id,
        editHistoryId: simulatedSnapshot.id,
      },
    );
  typia.assert(snapshot);

  // Validate that the snapshot is for the requested post
  TestValidator.equals(
    "snapshot.post.id should match requested post id",
    snapshot.post.id,
    post.id,
  );

  // 6. Verify that a non-existing editHistoryId causes an error
  const randomNonExistingEditHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "non-existing editHistoryId must cause an error",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.editHistories.at(
        connection,
        {
          postId: post.id,
          editHistoryId: randomNonExistingEditHistoryId,
        },
      );
    },
  );
}
