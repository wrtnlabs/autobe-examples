import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_post_update_edit_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community as moderator
  const communityData = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-z0-9_]+$">
    >(),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 7,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member account (post author)
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create initial text post with edited=false
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    post_type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const initialPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(initialPost);

  // Step 5: Verify initial state - edited should be false, updated_at should be null
  TestValidator.predicate(
    "initial post edited flag should be false",
    initialPost.edited === false,
  );
  TestValidator.predicate(
    "initial post updated_at should be null",
    initialPost.updated_at === null || initialPost.updated_at === undefined,
  );

  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Perform first edit to the post
  const firstUpdateData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 9 }),
    body: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 12,
      sentenceMax: 18,
    }),
  } satisfies IRedditCommunityPost.IUpdate;

  const firstEditedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.update(connection, {
      postId: initialPost.id,
      body: firstUpdateData,
    });
  typia.assert(firstEditedPost);

  // Step 7: Verify first edit - edited should be true, updated_at should be set
  TestValidator.predicate(
    "edited flag should be true after first edit",
    firstEditedPost.edited === true,
  );
  TestValidator.predicate(
    "updated_at should be set after first edit",
    firstEditedPost.updated_at !== null &&
      firstEditedPost.updated_at !== undefined,
  );

  // Step 8: Verify updated_at is later than created_at
  if (
    firstEditedPost.updated_at !== null &&
    firstEditedPost.updated_at !== undefined
  ) {
    const createdTime = new Date(firstEditedPost.created_at).getTime();
    const updatedTime = new Date(firstEditedPost.updated_at).getTime();
    TestValidator.predicate(
      "updated_at should be later than created_at",
      updatedTime >= createdTime,
    );
  }

  // Small delay to ensure timestamp difference for second edit
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 9: Perform second edit to verify continued timestamp updates
  const secondUpdateData = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
  } satisfies IRedditCommunityPost.IUpdate;

  const secondEditedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.update(connection, {
      postId: initialPost.id,
      body: secondUpdateData,
    });
  typia.assert(secondEditedPost);

  // Step 10: Verify second edit maintains edited=true and updates timestamp
  TestValidator.predicate(
    "edited flag should remain true after second edit",
    secondEditedPost.edited === true,
  );
  TestValidator.predicate(
    "updated_at should be set after second edit",
    secondEditedPost.updated_at !== null &&
      secondEditedPost.updated_at !== undefined,
  );

  // Step 11: Verify second updated_at is later than or equal to first updated_at
  if (
    firstEditedPost.updated_at !== null &&
    firstEditedPost.updated_at !== undefined &&
    secondEditedPost.updated_at !== null &&
    secondEditedPost.updated_at !== undefined
  ) {
    const firstUpdateTime = new Date(firstEditedPost.updated_at).getTime();
    const secondUpdateTime = new Date(secondEditedPost.updated_at).getTime();
    TestValidator.predicate(
      "second updated_at should be later than or equal to first updated_at",
      secondUpdateTime >= firstUpdateTime,
    );
  }
}
