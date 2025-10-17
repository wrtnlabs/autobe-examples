import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_post_update_by_author_success(
  connection: api.IConnection,
) {
  // 1. Register author (member) and obtain authorization
  const authorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorBody,
    });
  typia.assert(author);

  // 2. Create a community with a unique slug
  const uniqueSlug = `${RandomGenerator.alphaNumeric(6).toLowerCase()}-${Date.now()}`;
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Subscribe the author to the community (if required)
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4. Create a text post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Update the post as the author
  const updateBody = {
    title: `Updated: ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 })}`,
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPortalPost.IUpdate;

  const updated: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updated);

  // Business validations
  TestValidator.equals("post id preserved", updated.id, post.id);
  TestValidator.equals(
    "community id preserved",
    updated.community_id,
    post.community_id,
  );
  TestValidator.equals(
    "author_user_id preserved",
    updated.author_user_id,
    post.author_user_id,
  );
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    post.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    post.updated_at,
  );

  // Ensure updated fields reflect the request and are not empty
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals("body updated", updated.body, updateBody.body);
  TestValidator.predicate(
    "updated title not empty",
    typeof updated.title === "string" && updated.title.length > 0,
  );
  TestValidator.predicate(
    "updated body not empty",
    updated.body !== null &&
      typeof updated.body === "string" &&
      updated.body.length > 0,
  );
}
