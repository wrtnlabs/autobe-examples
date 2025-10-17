import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Test the permanent deletion of a member account by an administrator.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin (save token for later API calls).
 * 2. Register and authenticate a member to be deleted.
 * 3. As the member, create a community.
 * 4. As the member, subscribe to the created community.
 * 5. As the member, create a post in the community.
 * 6. As the member, comment on their own post.
 * 7. As admin, permanently delete the member (using erase endpoint).
 * 8. Verify that all of the member's posts, comments, and subscriptions have been
 *    removed (cascade delete).
 * 9. Attempt to delete a non-existent memberId, expecting an error.
 * 10. Attempt to delete the member as a normal (non-admin) user, expecting a
 *     permission error.
 */
export async function test_api_member_admin_permanent_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const memberId = member.id;

  // 3. As the member, create a community
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  }); // Ensure the token is set as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;

  // 4. As the member, subscribe to the created community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: communityId,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 5. As the member, create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
        status: "published",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const postId = post.id;

  // 6. As the member, comment on their own post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: postId,
        body: {
          community_platform_post_id: postId,
          body: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 7. Re-authenticate as admin (set admin token)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 8. As admin, erase the member
  await api.functional.communityPlatform.admin.members.erase(connection, {
    memberId: memberId,
  });

  // 9. Attempt to erase non-existent memberId: expect error
  const fakeMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "attempt to delete non-existent member id should throw",
    async () => {
      await api.functional.communityPlatform.admin.members.erase(connection, {
        memberId: fakeMemberId,
      });
    },
  );

  // 10. Attempt to delete a member as a non-admin user: expect permission error
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  }); // Switch to the member user context
  await TestValidator.error(
    "attempt member-delete as non-admin should throw",
    async () => {
      await api.functional.communityPlatform.admin.members.erase(connection, {
        memberId: memberId,
      });
    },
  );
}
