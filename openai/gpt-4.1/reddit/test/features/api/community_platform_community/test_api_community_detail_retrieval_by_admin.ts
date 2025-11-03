import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates admin-level retrieval of community detail.
 *
 * This test covers end-to-end verification that an admin account can retrieve
 * the full details of a newly-created community with correct context and
 * metadata. Steps:
 *
 * 1. Create a platform admin
 * 2. Create a platform user
 * 3. The user creates a community
 * 4. The admin retrieves the community via the admin detail endpoint
 * 5. All required fields, including creator reference, must be present and correct
 */
export async function test_api_community_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminHref =
    "https://admin-join.example.com/" + RandomGenerator.alphaNumeric(8);
  const adminReferrer =
    "https://referrer.example.com/" + RandomGenerator.alphaNumeric(6);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName satisfies string,
      href: adminHref as string,
      referrer: adminReferrer as string,
      // IP is optional; omit for most tests
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userDisplayName = RandomGenerator.name();
  const userHref =
    "https://user-join.example.com/" + RandomGenerator.alphaNumeric(8);
  const userReferrer =
    "https://ref.example.com/" + RandomGenerator.alphaNumeric(5);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: userHref,
      referrer: userReferrer,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 3. User creates a new community
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName satisfies string,
        description: communityDescription satisfies string,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Switch back to admin context (token management handled by SDK)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  // 5. Retrieve the community as admin
  const detail = await api.functional.communityPlatform.admin.communities.at(
    connection,
    {
      communityId: community.id,
    },
  );
  typia.assert(detail);
  // 6. Business logic assertions
  TestValidator.equals(
    "retrieved community id matches",
    detail.id,
    community.id,
  );
  TestValidator.equals("name matches", detail.name, communityName);
  TestValidator.equals(
    "description matches",
    detail.description,
    communityDescription,
  );
  TestValidator.equals(
    "creator_user_id matches user id",
    detail.creator_user_id,
    user.id,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined after creation",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );
}
