import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates public access to community detail retrieval by ID.
 *
 * This test simulates registration of a new member, creation of a new community
 * by that member, then verifies that anyone (including a guest user) can
 * retrieve the detail for that community by its communityId using the public
 * detail endpoint. The test checks that core metadata (name, title,
 * description, slug, status, creator_member_id) are correctly populated and
 * that all expected fields are present. Since the endpoint is public, the
 * retrieval step is performed without authentication and must succeed. Also,
 * edge cases including a just-created community and correct field population
 * are checked.
 *
 * Steps:
 *
 * 1. Register a new platform member (to act as community creator)
 * 2. Create a new community as the registered member
 * 3. Retrieve the community detail as a guest using its id
 * 4. Assert all fields are present and values match what was created
 */
export async function test_api_community_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // 2. Create a community as that member (now authenticated)
  const createCommunityBody = {
    name: RandomGenerator.name(1).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const created =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(created);

  // 3. As a guest (non-authenticated), retrieve detail for this community
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const got = await api.functional.communityPlatform.communities.at(
    unauthConn,
    { communityId: created.id },
  );
  typia.assert(got);

  // 4. Check core metadata and field consistency
  TestValidator.equals("community id matches", got.id, created.id);
  TestValidator.equals("name matches", got.name, createCommunityBody.name);
  TestValidator.equals("title matches", got.title, createCommunityBody.title);
  TestValidator.equals("slug matches", got.slug, createCommunityBody.slug);
  TestValidator.equals(
    "description matches",
    got.description,
    createCommunityBody.description,
  );
  TestValidator.equals("status is active", got.status, "active");
  TestValidator.equals(
    "creator_member_id matches",
    got.creator_member_id,
    member.id,
  );
  TestValidator.predicate(
    "created_at is defined",
    typeof got.created_at === "string" && got.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is defined",
    typeof got.updated_at === "string" && got.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for new community",
    got.deleted_at,
    null,
  );
}
