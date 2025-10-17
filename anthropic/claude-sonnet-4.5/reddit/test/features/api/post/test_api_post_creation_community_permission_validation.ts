import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that post creation respects community posting permission settings.
 *
 * This test validates the complete permission workflow for restricted
 * communities:
 *
 * 1. Creates a moderator account
 * 2. Moderator creates a community with 'moderators_only' posting permission
 * 3. Registers a regular member account
 * 4. Member subscribes to the restricted community
 * 5. Verifies that the member CANNOT create posts (permission denied)
 * 6. Switches back to moderator context
 * 7. Verifies that the moderator CAN create posts in the restricted community
 *
 * This ensures posting_permission settings are properly enforced at the API
 * level.
 */
export async function test_api_post_creation_community_permission_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account first (will create the restricted community)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates community with moderators_only posting permission
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        posting_permission: "moderators_only",
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  TestValidator.equals(
    "community posting permission is moderators_only",
    community.posting_permission,
    "moderators_only",
  );

  // Step 3: Create regular member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member subscribes to the restricted community
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community id matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member id matches",
    subscription.member_id,
    member.id,
  );

  // Step 5: Verify that regular member CANNOT create posts in moderators_only community
  await TestValidator.error(
    "regular member cannot create post in moderators_only community",
    async () => {
      await api.functional.redditLike.member.communities.posts.create(
        connection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
            type: "text",
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditLikePost.ICreate,
        },
      );
    },
  );

  // Step 6: Switch back to moderator account by re-joining (simulates re-authentication)
  const moderatorReauth = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderatorReauth);

  // Step 7: Moderator creates their own community with moderators_only permission
  const modCommunityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const modCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: modCommunityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        posting_permission: "moderators_only",
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: false,
        allow_image_posts: false,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(modCommunity);
  TestValidator.equals(
    "moderator community posting permission is moderators_only",
    modCommunity.posting_permission,
    "moderators_only",
  );

  // Step 8: Verify that moderator CAN create posts in their own moderators_only community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({ paragraphs: 3 });
  const moderatorPost =
    await api.functional.redditLike.member.communities.posts.create(
      connection,
      {
        communityId: modCommunity.id,
        body: {
          community_id: modCommunity.id,
          type: "text",
          title: postTitle,
          body: postBody,
        } satisfies IRedditLikePost.ICreate,
      },
    );
  typia.assert(moderatorPost);
  TestValidator.equals(
    "moderator post type is text",
    moderatorPost.type,
    "text",
  );
}
