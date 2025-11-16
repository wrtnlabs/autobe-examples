import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_admin_user_karma_delete_after_member_activity(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser.join sets Authorization)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    // ip is optional; let backend infer or accept null
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As member user, create a community
  const communityCreateBody = {
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
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Validate community ownership matches member user id
  TestValidator.equals(
    "community owner is the joined member user",
    community.owner_memberuser_id,
    memberAuthorized.id,
  );

  // 3. As member user, create a membership in the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Validate membership community linkage
  TestValidator.equals(
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id matches joined member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. As member user, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    // leave url undefined to create a text-style post
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Validate post is linked to the correct community
  TestValidator.equals(
    "post community id matches created community",
    post.community_id,
    community.id,
  );

  // 5. As member user, create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    // top-level comment, no parentCommentId
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // Validate comment belongs to the correct post
  TestValidator.equals(
    "comment post id matches created post",
    comment.post.id,
    post.id,
  );

  // 6. Register and authenticate an admin user (adminUser.join sets Authorization)
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. As admin user, attempt to erase a user karma aggregate record
  const targetUserKarmaId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.communityPlatform.adminUser.userKarmas.erase(
    connection,
    {
      userKarmaId: targetUserKarmaId,
    },
  );

  // If the call above does not throw, we have validated that an admin can call
  // the erase endpoint. Now verify that a member user cannot.

  // 8. Switch back to member user context using login
  const memberLoginBody = {
    identifier: memberJoinBody.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberReAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuthorized);

  // Sanity check: reauthorized member is the same account
  TestValidator.equals(
    "re-logged member id matches original member",
    memberReAuthorized.id,
    memberAuthorized.id,
  );

  // 9. As member user, calling the admin erase endpoint should result in an error
  await TestValidator.error(
    "member user cannot erase user karma aggregates",
    async () => {
      await api.functional.communityPlatform.adminUser.userKarmas.erase(
        connection,
        {
          userKarmaId: targetUserKarmaId,
        },
      );
    },
  );
}
