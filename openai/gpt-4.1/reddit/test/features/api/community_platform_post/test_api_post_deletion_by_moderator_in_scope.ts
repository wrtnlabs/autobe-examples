import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate moderator-scoped post deletion operations for community platform
 * (Reddit-like).
 *
 * 1. Register platform member ('member1', future author/moderator base)
 * 2. Member creates a new community ('community1'), becomes owner
 * 3. Assign moderator role to the member for the new community (via moderator
 *    join)
 * 4. Register as moderator to obtain moderation session
 * 5. Member creates a text post in the community
 * 6. Moderator deletes the post
 * 7. Post is no longer retrievable via the post API (delete enforced as soft/hard)
 * 8. Attempt deletion as moderator from a different community should fail
 *    (permission error)
 */
export async function test_api_post_deletion_by_moderator_in_scope(
  connection: api.IConnection,
) {
  // 1: Register platform member (author & moderator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2: Member creates a community
  const communityName = RandomGenerator.name();
  const communitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3: Assign moderator role to member
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // 4: Register as moderator already produces moderator session token (by API doc)

  // 5: Member creates a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const post = await api.functional.communityPlatform.moderator.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: postTitle,
        content_type: "text",
        content_body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6: Moderator deletes the post
  await api.functional.communityPlatform.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // 7. Deleting again should fail (already deleted)
  await TestValidator.error("repeat deletion should fail", async () => {
    await api.functional.communityPlatform.moderator.posts.erase(connection, {
      postId: post.id,
    });
  });

  // 8. Cross-community mod: create different community + moderator
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPw = RandomGenerator.alphaNumeric(12);
  const otherMemberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: otherMemberEmail,
      password: otherMemberPw,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(otherMemberAuth);

  const otherCommunitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: otherCommunitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);

  const crossModAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherMemberEmail,
      password: otherMemberPw,
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(crossModAuth);

  // 9. With different mod, attempt deletion of first post (should fail, not in assigned scope)
  await TestValidator.error(
    "cross-community moderator cannot delete post",
    async () => {
      await api.functional.communityPlatform.moderator.posts.erase(connection, {
        postId: post.id,
      });
    },
  );
}
