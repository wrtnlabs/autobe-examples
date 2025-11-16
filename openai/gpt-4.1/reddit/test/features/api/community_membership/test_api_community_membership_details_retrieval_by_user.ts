import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates retrieval of community membership details by the owning user.
 *
 * This end-to-end test ensures a legitimate user can retrieve the exact details
 * of their membership in a specific community, verifying data integrity and
 * access control across the membership API. The test covers normal access and
 * soft-deletion scenarios.
 *
 * 1. Register a new user and authenticate.
 * 2. Create a new community membership (using a randomly generated community name
 *    for isolation).
 * 3. Retrieve membership details using the correct communityName and membershipId,
 *    as the authenticated user.
 * 4. Assert that the result includes correct status, audit timestamps (created_at,
 *    updated_at, deleted_at), user and community references, and that the
 *    membership status is initially active.
 * 5. Assert that the user reference in the membership matches the authenticated
 *    user, and the community reference name matches the test community.
 * 6. (Soft-delete scenario) Simulate soft-deletion by directly updating the
 *    deleted_at property with a new timestamp (if such test APIs available,
 *    otherwise skip).
 * 7. Re-fetch and validate that deleted_at is now present and accurately set,
 *    status, id, community and user relations remain correct, and business
 *    rules prevent normal access by unauthorized users (unauthenticated or
 *    other user). (If soft-delete cannot be simulated with available APIs, this
 *    block is skipped.)
 */
export async function test_api_community_membership_details_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a new community membership
  const communityName = RandomGenerator.alphaNumeric(10);
  const membership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityName,
        body: {}, // join_request_id is optional and omitted
      },
    );
  typia.assert(membership);

  // 3. Retrieve membership details using correct communityName and membershipId
  const details =
    await api.functional.communityPlatform.user.communities.memberships.at(
      connection,
      {
        communityName: membership.community.name,
        membershipId: membership.id,
      },
    );
  typia.assert(details);

  // 4. Assert key properties and relations
  TestValidator.equals(
    "membership status should be active after creation",
    details.status,
    "active", // business rule, newly created membership is 'active' or provider-specific
  );
  TestValidator.equals(
    "user id in membership matches authenticated user",
    details.user.id,
    user.id,
  );
  TestValidator.equals(
    "community name matches the test community",
    details.community.name,
    communityName,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date",
    typeof details.created_at === "string" && !!Date.parse(details.created_at),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date",
    typeof details.updated_at === "string" && !!Date.parse(details.updated_at),
  );
  // deleted_at should be null or undefined for active membership
  TestValidator.predicate(
    "deleted_at is null or undefined for active membership",
    details.deleted_at === null || details.deleted_at === undefined,
  );

  // 5. Negative scenario (optional): Unauthenticated/other user cannot access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-authenticated user cannot retrieve membership details",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.at(
        unauthConn,
        {
          communityName: membership.community.name,
          membershipId: membership.id,
        },
      );
    },
  );
}
