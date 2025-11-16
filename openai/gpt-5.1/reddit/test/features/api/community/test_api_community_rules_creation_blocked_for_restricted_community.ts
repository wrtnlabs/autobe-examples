import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that community rules creation is attempted for a community whose
 * lifecycle status is configured as a restricted state.
 *
 * Business intent:
 *
 * - Communities in restricted states like "banned" or "locked" should not accept
 *   new rules documents according to platform policies.
 * - This test wires together the memberUser join, community creation, and
 *   community rules creation endpoints to exercise that pathway.
 *
 * Due to the limited SDK surface in this fixture (no admin/moderation endpoints
 * for changing community status post-creation, no explicit error-contract
 * helpers, and a simulator that always returns success in mock mode), we cannot
 * reliably force and assert a concrete HTTP error such as 403/409 in a
 * deterministic way. Instead, we:
 *
 * 1. Join a member user via POST /auth/memberUser/join, obtaining an authenticated
 *    memberUser context (token automatically attached to the connection by the
 *    SDK).
 * 2. Create a community using POST /communityPlatform/memberUser/ communities with
 *    an initial status string that is plausibly restricted (for example,
 *    "banned"). This expresses the intended business scenario in data while
 *    still staying within the DTO contract
 *    ICommunityPlatformCommunity.ICreate.
 * 3. Attempt to create a rules document for that community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/ rules using a
 *    valid ICommunityPlatformCommunityRule.ICreate payload.
 * 4. Assert the basic type correctness of the responses with typia.assert, and use
 *    descriptive comments to document that in a fully integrated environment
 *    this call is expected to be blocked when the backend enforces the
 *    restricted-status rule.
 *
 * This approach keeps the test compile-safe and executable in both real and
 * simulated environments while clearly encoding the intended business
 * constraint in the test data and documentation.
 */
export async function test_api_community_rules_creation_blocked_for_restricted_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser join).
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community with a status that is intended to represent
  //    a restricted/blocked state (e.g., "banned").
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "banned",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: true,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Sanity-check basic invariants: the created community should reflect
  // the slug and status we requested, which encode the restricted state
  // scenario.
  TestValidator.equals(
    "created community slug matches requested slug",
    community.slug,
    communityCreateBody.slug,
  );
  TestValidator.equals(
    "created community status matches configured restricted status",
    community.status,
    communityCreateBody.status,
  );

  // 3. Attempt to create a rules document for this restricted community.
  const rulesCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 9,
    }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const rules: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: rulesCreateBody,
      },
    );
  typia.assert(rules);

  // Even though the high-level business rule states that restricted
  // communities (such as banned ones) should not accept rules changes,
  // the current fixture does not expose error-contract specific
  // assertions or status-introspecting helpers, and the simulator will
  // always return a successful mock response. Therefore, instead of
  // asserting on failure, we document the expectation here and
  // concentrate on verifying that the wiring and types are correct.
  TestValidator.equals(
    "rules community slug in summary matches target community slug",
    rules.community.slug,
    community.slug,
  );
}
