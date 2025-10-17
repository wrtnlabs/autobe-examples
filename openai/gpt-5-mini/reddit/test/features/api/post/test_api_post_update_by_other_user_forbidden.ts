import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_post_update_by_other_user_forbidden(
  connection: api.IConnection,
) {
  // Register authorUser with isolated connection
  const connAuthor: api.IConnection = { ...connection, headers: {} };
  const authorPayload = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connAuthor, {
      body: authorPayload,
    });
  typia.assert(author);

  // Register otherUser with its own isolated connection
  const connOther: api.IConnection = { ...connection, headers: {} };
  const otherPayload = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const other: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connOther, {
      body: otherPayload,
    });
  typia.assert(other);

  // Create a community as author
  const communityBody = {
    name: RandomGenerator.name(2),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connAuthor, {
      body: communityBody,
    });
  typia.assert(community);

  // Subscribe author to the community (satisfies dependency)
  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connAuthor,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // Create a text post as the author
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: initialTitle,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connAuthor, {
      body: postBody,
    });
  typia.assert(post);

  // Ensure the created post was authored by the author (if present)
  TestValidator.equals("post author matches", post.author_user_id, author.id);

  // Attempt update as otherUser (should fail - 403 or 404 depending on policy)
  await TestValidator.error("other user cannot update post", async () => {
    await api.functional.communityPortal.member.posts.update(connOther, {
      postId: post.id,
      body: {
        title: "hacked-title",
      } satisfies ICommunityPortalPost.IUpdate,
    });
  });

  // As a positive control, author should be able to update their post
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updated: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.update(connAuthor, {
      postId: post.id,
      body: {
        title: newTitle,
      } satisfies ICommunityPortalPost.IUpdate,
    });
  typia.assert(updated);

  // Validate the owner update took effect
  TestValidator.equals("owner can update post title", updated.title, newTitle);
}
