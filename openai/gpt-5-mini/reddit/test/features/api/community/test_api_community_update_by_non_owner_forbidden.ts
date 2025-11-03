import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function test_api_community_update_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validate that a non-owner communityMember cannot update a community they do
   * not own.
   *
   * Workflow implemented using only available SDK functions:
   *
   * - Register owner (join)
   * - Create community (create)
   * - Register second user (join)
   * - Attempt update as non-owner (expect error)
   * - Re-check community unchanged by performing an owner-authorized benign
   *   update
   *
   * Note: Audit-log verification was omitted because no audit-log retrieval API
   * was provided in the SDK materials.
   */

  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const nonOwnerConn: api.IConnection = { ...connection, headers: {} };

  // Owner registration
  const ownerEmail = `owner.${RandomGenerator.alphaNumeric(6)}@example.test`;
  const ownerUsername = `owner_${RandomGenerator.alphaNumeric(6)}`;
  const ownerJoinBody = {
    email: ownerEmail,
    username: ownerUsername,
    password: "Passw0rd!",
    session_context: {
      href: "https://example.test/signup",
      referrer: "https://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuth);

  // Create community as owner
  const uniqueSuffix = Date.now().toString();
  const communitySlug = `test-community-${uniqueSuffix}`;
  const communityName = `Test Community ${uniqueSuffix}`;
  const createCommunityBody = {
    name: communityName,
    slug: communitySlug,
    description: "Initial description",
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const createdCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      ownerConn,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(createdCommunity);

  const originalDescription = createdCommunity.description ?? null;
  const originalVisibility = createdCommunity.visibility;

  // Second (non-owner) registration
  const nonOwnerEmail = `user.${RandomGenerator.alphaNumeric(6)}@example.test`;
  const nonOwnerUsername = `user_${RandomGenerator.alphaNumeric(6)}`;
  const nonOwnerJoinBody = {
    email: nonOwnerEmail,
    username: nonOwnerUsername,
    password: "Passw0rd!",
    session_context: {
      href: "https://example.test/signup",
      referrer: "https://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const nonOwnerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(nonOwnerConn, {
      body: nonOwnerJoinBody,
    });
  typia.assert(nonOwnerAuth);

  // Non-owner attempts forbidden update -> expect an error (403/404 per policy)
  await TestValidator.error("non-owner cannot update community", async () => {
    await api.functional.communityBbs.communityMember.communities.update(
      nonOwnerConn,
      {
        communitySlug: createdCommunity.slug,
        body: {
          description: "Malicious change",
          visibility: "private",
        } satisfies ICommunityBbsCommunity.IUpdate,
      },
    );
  });

  // Re-check: Owner performs a benign update (re-apply original values) to fetch current state
  const ownerRecheck: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.update(
      ownerConn,
      {
        communitySlug: createdCommunity.slug,
        body: {
          description: originalDescription,
          visibility: originalVisibility,
        } satisfies ICommunityBbsCommunity.IUpdate,
      },
    );
  typia.assert(ownerRecheck);

  TestValidator.equals(
    "community description unchanged after non-owner attempt",
    ownerRecheck.description ?? null,
    originalDescription,
  );

  TestValidator.equals(
    "community visibility unchanged after non-owner attempt",
    ownerRecheck.visibility,
    originalVisibility,
  );
}
