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

export async function test_api_admin_post_unlock_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register & authenticate memberUser via join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.local/join",
    referrer: "https://frontend.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post as memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(createdPost);

  TestValidator.equals(
    "created post should not be locked initially",
    createdPost.is_locked,
    false,
  );

  // 4. Register & authenticate adminUser via join
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  const adminIdentifier: string = adminAuthorized.email;

  // 5. Lock the post as adminUser
  const lockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: createdPost.id,
        body: {
          is_locked: true,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformPost>(lockedPost);

  TestValidator.equals(
    "post should be locked after admin lock operation",
    lockedPost.is_locked,
    true,
  );

  // Capture core fields before negative tests
  const coreBefore = {
    id: lockedPost.id,
    community_id: lockedPost.community_id,
    author_memberuser_id: lockedPost.author_memberuser_id,
    title: lockedPost.title,
    status: lockedPost.status,
  };

  // 6. Read the post via public read endpoint to confirm locked
  const lockedPostRead: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert<ICommunityPlatformPost>(lockedPostRead);
  TestValidator.equals(
    "read post should be locked before unauthorized unlock attempts",
    lockedPostRead.is_locked,
    true,
  );

  // 7. Attempt unlock without any Authorization header (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot unlock post",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.unlock(
        unauthenticatedConnection,
        {
          postId: createdPost.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // Ensure post still locked after unauthenticated attempt
  const afterUnauthRead: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert<ICommunityPlatformPost>(afterUnauthRead);
  TestValidator.equals(
    "post remains locked after unauthenticated unlock attempt",
    afterUnauthRead.is_locked,
    true,
  );

  // 8. Attempt unlock using memberUser token instead of adminUser token
  // First, authenticate explicitly as memberUser using login to ensure token context
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://frontend.local/login",
    referrer: "https://frontend.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberReAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberReAuthorized);

  await TestValidator.error(
    "memberUser cannot unlock post via admin endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.unlock(
        connection,
        {
          postId: createdPost.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  const afterMemberRead: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert<ICommunityPlatformPost>(afterMemberRead);
  TestValidator.equals(
    "post remains locked after memberUser unlock attempt",
    afterMemberRead.is_locked,
    true,
  );

  // 9. Authenticate as adminUser via login and successfully unlock
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminJoinBody.password,
    ip: null,
    href: "https://frontend.local/admin/login",
    referrer: "https://frontend.local/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminReAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminReAuthorized);

  const unlockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.unlock(connection, {
      postId: createdPost.id as string & tags.Format<"uuid">,
    });
  typia.assert<ICommunityPlatformPost>(unlockedPost);

  TestValidator.equals(
    "post should be unlocked after admin unlock operation",
    unlockedPost.is_locked,
    false,
  );

  // 10. Fetch post again and verify core fields unchanged & lock flag false
  const finalPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert<ICommunityPlatformPost>(finalPost);

  TestValidator.equals(
    "core field id must remain unchanged",
    finalPost.id,
    coreBefore.id,
  );
  TestValidator.equals(
    "core field community_id must remain unchanged",
    finalPost.community_id,
    coreBefore.community_id,
  );
  TestValidator.equals(
    "core field author_memberuser_id must remain unchanged",
    finalPost.author_memberuser_id,
    coreBefore.author_memberuser_id,
  );
  TestValidator.equals(
    "core field title must remain unchanged",
    finalPost.title,
    coreBefore.title,
  );
  TestValidator.equals(
    "core field status must remain unchanged",
    finalPost.status,
    coreBefore.status,
  );
  TestValidator.equals(
    "final post should be unlocked",
    finalPost.is_locked,
    false,
  );
}
