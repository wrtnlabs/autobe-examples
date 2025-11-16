import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_admin_delete_post(connection: api.IConnection) {
  // 1. RegisteredUser joins
  const registeredUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: registeredUserEmail,
        password: "StrongPassword123!",
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://referrer.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    },
  );
  typia.assert(registeredUser);

  // 2. RegisteredUser logs in
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: registeredUserEmail,
      password: "StrongPassword123!",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://referrer.com",
    } satisfies IRedditCommunityRegisteredUser.ILogin,
  });

  // 3. RegisteredUser creates a community
  const communityCode = `${RandomGenerator.alphabets(10)}`.toLowerCase();
  const communityCreateBody = {
    communityName: communityCode,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. RegisteredUser creates a post in the community
  const postCreateBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text",
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post = await api.functional.redditCommunity.registeredUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);

  // 5. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: "AdminPass123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // 6. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      ip: null,
      href: "https://example.com/admin/login",
      referrer: "https://referrer.com",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 7. Admin deletes the post
  await api.functional.redditCommunity.admin.posts.erase(connection, {
    postId: post.id,
  });
}
