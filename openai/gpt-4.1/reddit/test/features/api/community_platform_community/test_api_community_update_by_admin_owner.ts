import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Validate admin ability to update a community's properties (title,
 * description, status, slug). Ensures audit properties update accordingly and
 * that only admins are authorized for this endpoint.
 *
 * 1. Register as a new admin
 * 2. As admin, create a new community
 * 3. As admin, update the community (change title, description, slug, status)
 * 4. Validate field changes and audit trails (updated_at increases and other
 *    fields persist)
 * 5. Attempt to update community to a duplicate slug and expect failure
 * 6. Attempt forbidden status update (e.g., to 'banned' from 'archived') and
 *    expect failure
 * 7. Attempt update as non-admin and expect authorization failure
 */
export async function test_api_community_update_by_admin_owner(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates a community
  const communityCreate = {
    name: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // Step 3: Update the community as admin
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedSlug = RandomGenerator.alphaNumeric(11);
  const updatedStatus = "private";
  const beforeUpdateAt = community.updated_at;
  const updated =
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          title: updatedTitle,
          description: updatedDescription,
          slug: updatedSlug,
          status: updatedStatus,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated);

  // Step 4: Validate update effect
  TestValidator.equals("community id remains", updated.id, community.id);
  TestValidator.notEquals("title updated", updated.title, community.title);
  TestValidator.equals("title as updated", updated.title, updatedTitle);
  TestValidator.equals(
    "description as updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.notEquals("slug updated", updated.slug, community.slug);
  TestValidator.equals("slug as updated", updated.slug, updatedSlug);
  TestValidator.equals("status as updated", updated.status, updatedStatus);
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updated.updated_at).getTime() > new Date(beforeUpdateAt).getTime(),
  );

  // Step 5: Attempt duplicate slug
  // Create another community first
  const dupCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(13),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(9),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(dupCommunity);
  await TestValidator.error("fail on duplicate slug", async () => {
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          slug: dupCommunity.slug,
        },
      },
    );
  });

  // Step 6: Attempt forbidden status transition
  // e.g., setting status to an unsupported string should fail
  await TestValidator.error("fail on forbidden status value", async () => {
    await api.functional.communityPlatform.admin.communities.update(
      connection,
      {
        communityId: community.id,
        body: {
          status: "invalid-status-name",
        },
      },
    );
  });

  // Step 7: Attempt update as non-admin (simulate guest by making empty headers connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot update community", async () => {
    await api.functional.communityPlatform.admin.communities.update(
      unauthConn,
      {
        communityId: community.id,
        body: {
          title: "Should Not Succeed",
        },
      },
    );
  });
}
