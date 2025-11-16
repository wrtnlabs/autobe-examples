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

/**
 * Validate admin community deletion idempotency-like behavior.
 *
 * Business context: This test ensures that when an admin user deletes an
 * existing community by its slug, the operation succeeds once and subsequent
 * delete attempts on the same slug fail with an error indicating the community
 * no longer exists. This demonstrates an idempotency-like behavior where
 * repeated deletes do not re-delete or silently succeed but signal that the
 * resource has already been removed.
 *
 * Steps:
 *
 * 1. Register a memberUser account and obtain an authenticated member session.
 * 2. As the memberUser, create a new community with a unique slug.
 * 3. Register an adminUser account and obtain an authenticated admin session.
 * 4. As the adminUser, delete the community by its slug (first DELETE) and verify
 *    the call succeeds (no error thrown).
 * 5. Immediately attempt to delete the same community slug again (second DELETE)
 *    and verify that the call fails by throwing an error, indicating the
 *    community is already removed.
 */
export async function test_api_community_delete_idempotency_like_behavior(
  connection: api.IConnection,
) {
  // 1. Register a memberUser account and obtain an authenticated member session.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As the memberUser, create a new community with a unique slug.
  const communitySlug: string = RandomGenerator.alphaNumeric(16);

  const communityCreateBody = {
    slug: communitySlug,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Register an adminUser account and obtain an authenticated admin session.
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 4. As the adminUser, delete the community by its slug (first DELETE).
  await api.functional.communityPlatform.adminUser.communities.erase(
    connection,
    {
      communitySlug,
    },
  );

  // 5. Attempt to delete the same community slug again and expect an error.
  await TestValidator.error(
    "second delete on same community slug should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.erase(
        connection,
        {
          communitySlug,
        },
      );
    },
  );
}
