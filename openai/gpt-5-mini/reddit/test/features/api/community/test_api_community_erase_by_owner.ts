import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

/**
 * Validate owner-scoped community soft-delete (erase) flow.
 *
 * Business intent:
 *
 * - Owner (creator) can create and then soft-delete their community.
 * - Non-owners cannot delete owner's community (permission enforcement).
 * - Deleting an already-deleted community must fail (domain idempotency /
 *   conflict).
 *
 * Implementation notes:
 *
 * - Available SDK functions: join (auth), create (communities), erase
 *   (communities). There is no read/list or audit endpoint provided in the SDK
 *   materials, nor Prisma access imported in the template. Therefore DB-level
 *   assertions (deleted_at field, audit log entries) cannot be performed here.
 *   This test validates permission and idempotency semantics using the
 *   available endpoints. When list/get or DB access is added to the SDK, extend
 *   the test to assert deleted_at and audit logs.
 */
export async function test_api_community_erase_by_owner(
  connection: api.IConnection,
) {
  // Create two isolated connections so join() will set tokens per-connection
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // Owner: register
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.alphaNumeric(8);
  const ownerAuth = await api.functional.auth.communityMember.join(ownerConn, {
    body: {
      email: ownerEmail,
      username: ownerUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: "http://localhost/",
        referrer: "http://example.com/",
        ip: "127.0.0.1",
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(ownerAuth);

  // Owner: create community
  const slug =
    `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`.toLowerCase();
  const created =
    await api.functional.communityBbs.communityMember.communities.create(
      ownerConn,
      {
        body: {
          name: RandomGenerator.name(2),
          slug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created community slug matches generated slug",
    created.slug,
    slug,
  );

  // Non-owner: register
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const otherAuth = await api.functional.auth.communityMember.join(otherConn, {
    body: {
      email: otherEmail,
      username: otherUsername,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: "http://localhost/",
        referrer: "http://example.com/",
        ip: "127.0.0.1",
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(otherAuth);

  // Non-owner cannot delete the community
  await TestValidator.error(
    "non-owner cannot delete the community",
    async () => {
      await api.functional.communityBbs.communityMember.communities.erase(
        otherConn,
        {
          communitySlug: slug,
        },
      );
    },
  );

  // Owner deletes the community successfully (no thrown error)
  await api.functional.communityBbs.communityMember.communities.erase(
    ownerConn,
    {
      communitySlug: slug,
    },
  );

  // Double-delete must fail (domain-specific conflict / already-deleted)
  await TestValidator.error(
    "deleting an already-deleted community should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communities.erase(
        ownerConn,
        {
          communitySlug: slug,
        },
      );
    },
  );
}
