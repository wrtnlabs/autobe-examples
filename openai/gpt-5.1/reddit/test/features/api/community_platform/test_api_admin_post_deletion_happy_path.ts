import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_admin_post_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Member user joins (registration + initial authenticated session)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "memberPwd!123";
  const memberJoinHref: string = "https://client.example.com/member/join";
  const memberJoinReferrer: string = "https://client.example.com/landing";

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(memberAuthorized);

  // 2. Member user creates a community
  const communitySlug: string = RandomGenerator.alphaNumeric(12);
  const communityName: string = RandomGenerator.paragraph({ sentences: 1 });
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 5,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          slug: communitySlug,
          name: communityName,
          description: communityDescription,
          visibility: "public",
          status: "active",
          is_nsfw: false,
          is_quarantined: false,
          is_posting_restricted: false,
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Member user creates a post in that community
  const postTitle: string = RandomGenerator.paragraph({ sentences: 1 });
  const postBody: string = RandomGenerator.content({ paragraphs: 1 });
  const postUrl: string = typia.random<string & tags.Format<"uri">>();

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        communityId: community.id,
        communityCode: community.slug,
        title: postTitle,
        body: postBody,
        url: postUrl,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(createdPost);

  // Sanity checks for post linkage
  TestValidator.equals(
    "created post belongs to the community",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "created post authored by the joined member",
    createdPost.author_memberuser_id,
    memberAuthorized.id,
  );

  // 4. Admin user joins (and becomes authenticated)
  const adminUsername: string = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPwd!123";

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert(adminAuthorized);

  // 5. (Optional) Explicit admin login to exercise login flow and ensure token
  const adminLoginHref: string = "https://client.example.com/admin/login";
  const adminLoginReferrer: string = "https://client.example.com/admin";

  const adminReAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminLoginHref,
        referrer: adminLoginReferrer,
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    });
  typia.assert(adminReAuthorized);

  // 6. Admin deletes the post via adminUser posts.erase
  const deletedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.erase(connection, {
      postId: createdPost.id,
    });
  typia.assert(deletedPost);

  // 7. Validate deletion result matches original post identifiers
  TestValidator.equals(
    "deleted post id matches created post id",
    deletedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "deleted post community linkage preserved",
    deletedPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "deleted post author linkage preserved",
    deletedPost.author_memberuser_id,
    memberAuthorized.id,
  );
}
