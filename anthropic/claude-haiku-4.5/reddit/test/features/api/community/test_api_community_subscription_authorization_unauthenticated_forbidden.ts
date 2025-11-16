import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validate that unauthenticated users cannot access community subscription
 * lists.
 *
 * This test ensures proper authorization enforcement for subscription list
 * endpoints. Subscription lists contain member-only information and should only
 * be accessible to authenticated users. The test verifies that HTTP 403
 * Forbidden is returned when attempting to access subscriptions without
 * authentication.
 *
 * Test flow:
 *
 * 1. Create and authenticate an administrator for environment setup
 * 2. Create a community category for community classification
 * 3. Create and authenticate a member to establish member identity
 * 4. Create a community with the authenticated member
 * 5. Attempt to access subscriptions with an unauthenticated connection
 * 6. Verify HTTP 403 Forbidden response is returned
 */
export async function test_api_community_subscription_authorization_unauthenticated_forbidden(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a community category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(5)}`,
          identifier: `test-${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 6: Attempt to access subscriptions without authentication
  await TestValidator.httpError(
    "unauthenticated user cannot access subscription list",
    403,
    async () => {
      return await api.functional.communityPlatform.member.communities.subscriptions.index(
        unauthConnection,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    },
  );
}
