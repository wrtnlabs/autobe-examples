import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Create an inactive (non-active) rules document for an existing community.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a member user using POST /auth/memberUser/join.
 *
 *    - This yields ICommunityPlatformMemberuser.IAuthorized and sets the
 *         Authorization header on the shared connection automatically.
 * 2. Create a new community with POST /communityPlatform/memberUser/communities
 *    using ICommunityPlatformCommunity.ICreate.
 *
 *    - Use a unique slug and reasonable configuration flags.
 * 3. Create a rules document for that community using POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/rules with
 *    ICommunityPlatformCommunityRule.ICreate.
 *
 *    - Explicitly set is_active=false to represent a draft or historical ruleset.
 *    - Use a concrete version number such as 1 so we can assert it later.
 * 4. Validate that the rules response is correctly shaped and linked:
 *
 *    - Typia.assert on the ICommunityPlatformCommunityRule response.
 *    - Assert isActive is false.
 *    - Assert version equals the requested version.
 *    - Assert that the embedded community summary matches the created community's id
 *         and slug.
 *
 * Notes and constraints:
 *
 * - No list/search endpoint for rules is provided, so this test must not attempt
 *   to query rules collections. All validation is based solely on the single
 *   create response and the prior community creation response.
 * - Use only the provided SDK functions:
 *
 *   - Api.functional.auth.memberUser.join
 *   - Api.functional.communityPlatform.memberUser.communities.create
 *   - Api.functional.communityPlatform.memberUser.communities.rules.create
 * - All request bodies must be constructed with `satisfies` and must be strictly
 *   type-safe (no `as any`, no missing required fields).
 */
export async function test_api_community_rules_creation_with_inactive_version(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new community
  const communitySlug: string = RandomGenerator.alphabets(12);
  const communityBody = {
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create an inactive rules document for the community
  const requestedVersion = 1;
  const ruleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: requestedVersion,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleCreateBody,
      },
    );
  typia.assert(rule);

  // 4. Validate business expectations
  TestValidator.predicate(
    "created rules document should be inactive",
    rule.isActive === false,
  );

  TestValidator.equals(
    "rules version should match the requested version",
    rule.version,
    requestedVersion,
  );

  TestValidator.equals(
    "rules community summary id should match created community id",
    rule.community.id,
    community.id,
  );

  TestValidator.equals(
    "rules community summary slug should match created community slug",
    rule.community.slug,
    community.slug,
  );
}
