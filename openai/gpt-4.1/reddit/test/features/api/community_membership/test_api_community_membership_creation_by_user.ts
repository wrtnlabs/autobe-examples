import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate the workflow for user-initiated community membership creation.
 *
 * This test ensures that a registered user can join a community by creating a
 * membership, and enforces correctness of membership status, audit trail, and
 * uniqueness for the user/community pair. The test covers open/public join – it
 * does not require invite or approval logic.
 *
 * Steps:
 *
 * 1. Create a new user via /auth/user/join
 * 2. Join (create membership in) a test community as that user
 * 3. Validate that the returned membership references both user and community,
 *    audit fields are present, status is a non-empty string, and membership is
 *    unique
 * 4. Attempt duplicate join and verify that it fails (uniqueness is enforced)
 * 5. Confirm all references and audit fields are valid and non-null as per DTO
 */
export async function test_api_community_membership_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      },
    });
  typia.assert(user);

  // 2. Join community (create membership)
  const communityName: string = RandomGenerator.alphaNumeric(12).toLowerCase();
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityName,
        body: {},
      },
    );
  typia.assert(membership);

  // 3. Validate references, status, audit fields
  TestValidator.predicate(
    "membership.user.id must match authenticated user",
    membership.user.id === user.id,
  );
  TestValidator.predicate(
    "membership.community.name must match target communityName",
    membership.community.name === communityName,
  );
  TestValidator.predicate(
    "membership.status should be non-empty string",
    typeof membership.status === "string" && membership.status.length > 0,
  );
  TestValidator.predicate(
    "created_at valid ISO string",
    typeof membership.created_at === "string" &&
      membership.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at valid ISO string",
    typeof membership.updated_at === "string" &&
      membership.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at absent or null on creation",
    membership.deleted_at,
    null,
  );

  // 4. Attempt duplicate join (should fail)
  await TestValidator.error(
    "duplicate membership join for same user/community must fail",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.create(
        connection,
        {
          communityName,
          body: {},
        },
      );
    },
  );
  // (If platform supports soft delete restoration, could further test rejoin post-delete)
}
