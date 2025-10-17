import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * End-to-end test: Admin erases (soft-delete) a community.
 *
 * Business purpose:
 *
 * - Ensure that only authorized admin actors can perform community erase.
 * - Ensure unauthorized members cannot erase communities.
 * - Ensure erase operation is safe to re-run (idempotent or returns a non-auth
 *   error on subsequent runs).
 * - Validate server-side handling of malformed and non-existent UUIDs for the
 *   erase path parameter.
 *
 * Steps:
 *
 * 1. Member A registers and creates a community.
 * 2. Member B registers and attempts to erase the community (should fail).
 * 3. Admin registers and erases the community (should succeed).
 * 4. Admin repeats erase to validate idempotency / safe re-execution behavior.
 * 5. Admin attempts erase with malformed UUID (should error).
 * 6. Admin attempts erase for a non-existent UUID (should error).
 */
export async function test_api_community_erase_by_admin(
  connection: api.IConnection,
) {
  // 1) Member A registers (community creator)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphaNumeric(8);
  const memberABody = {
    username: memberAUsername,
    email: memberAEmail,
    password: "P@ssw0rd!",
  } satisfies ICommunityPortalMember.ICreate;

  const memberA: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberABody,
    });
  typia.assert(memberA);

  // 2) Member A creates a community
  const communityCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);
  const communityId: string & tags.Format<"uuid"> = community.id;

  // 3) Member B registers and attempts unauthorized delete
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphaNumeric(8);
  const memberBBody = {
    username: memberBUsername,
    email: memberBEmail,
    password: "P@ssw0rd!",
  } satisfies ICommunityPortalMember.ICreate;

  const memberB: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBBody,
    });
  typia.assert(memberB);

  // Member B (current connection token) must NOT be allowed to erase the community
  await TestValidator.error(
    "non-owner member cannot erase community",
    async () => {
      await api.functional.communityPortal.member.communities.erase(
        connection,
        {
          communityId,
        },
      );
    },
  );

  // 4) Admin registers and performs erase
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: "Str0ngAdm1n!",
    displayName: "E2E Admin",
    adminLevel: "super",
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  const admin: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // As admin (connection Authorization updated by join), erase should succeed
  await api.functional.communityPortal.member.communities.erase(connection, {
    communityId,
  });

  // Confirm admin erase executed (no exception thrown). Use a predicate to mark success.
  TestValidator.predicate("admin erase executed without throwing", true);

  // 5) Repeating DELETE to check idempotency or safe behavior
  try {
    await api.functional.communityPortal.member.communities.erase(connection, {
      communityId,
    });
    // If it succeeds again, treat as idempotent success
    TestValidator.predicate("second erase call succeeded (idempotent)", true);
  } catch (exp) {
    // If it fails, ensure failure is not an authorization failure for admin (must not be 401/403)
    if (exp instanceof api.HttpError) {
      TestValidator.predicate(
        "second erase failure is not an authorization error",
        exp.status !== 401 && exp.status !== 403,
      );
    } else {
      // Unexpected error type - rethrow to let the test harness capture it
      throw exp;
    }
  }

  // 6) Malformed UUID path parameter -> expect runtime error
  const malformedId = "not-a-uuid" as unknown as string & tags.Format<"uuid">;
  await TestValidator.error(
    "erase with malformed UUID should fail",
    async () =>
      await api.functional.communityPortal.member.communities.erase(
        connection,
        {
          communityId: malformedId,
        },
      ),
  );

  // 7) Non-existent community id -> expect runtime error
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "erase non-existent community should fail",
    async () =>
      await api.functional.communityPortal.member.communities.erase(
        connection,
        {
          communityId: fakeId,
        },
      ),
  );
}
