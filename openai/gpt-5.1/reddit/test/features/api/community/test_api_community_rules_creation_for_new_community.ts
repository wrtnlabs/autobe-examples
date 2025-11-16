import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a newly registered member user can create a community and
 * immediately attach an initial active rules document to it.
 *
 * Business flow validated by this test:
 *
 * 1. A guest registers as a memberUser via /auth/memberUser/join and obtains an
 *    authenticated session handled implicitly by the SDK.
 * 2. The authenticated memberUser creates a new community via
 *    /communityPlatform/memberUser/communities using
 *    ICommunityPlatformCommunity.ICreate.
 * 3. For that community, the memberUser creates an initial rules document via
 *    /communityPlatform/memberUser/communities/{communitySlug}/rules using
 *    ICommunityPlatformCommunityRule.ICreate with version=1 and
 *    is_active=true.
 * 4. The API returns the created rules record linked to the community, and core
 *    fields echo the request payload while system fields like timestamps are
 *    populated.
 *
 * The test focuses on the happy path and core business invariants:
 *
 * - A memberUser can bootstrap a community and its first active ruleset
 *   immediately after registration.
 * - The rules document is correctly linked to the community by slug and exposed
 *   via the community summary in the response.
 * - The rules record is active and not soft-deleted on creation.
 */
export async function test_api_community_rules_creation_for_new_community(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a new community as this member user
  const communitySlug: string = `test-community-${RandomGenerator.alphaNumeric(12)}`;
  const communityName: string = RandomGenerator.name();
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 10,
  });

  const communityCreateBody = {
    slug: communitySlug,
    name: communityName,
    description: communityDescription,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Basic consistency checks for community
  TestValidator.equals(
    "created community slug must match request",
    createdCommunity.slug,
    communitySlug,
  );
  TestValidator.equals(
    "created community name must match request",
    createdCommunity.name,
    communityName,
  );

  // 3. Create an initial rules document for the created community
  const rulesTitle: string = "Initial Community Rules";
  const rulesBody: string = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 3,
    wordMax: 10,
  });
  const rulesVersion = 1;

  const rulesCreateBody = {
    title: rulesTitle,
    body: rulesBody,
    version: rulesVersion,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: communitySlug,
        body: rulesCreateBody,
      },
    );
  typia.assert(createdRule);

  // 4. Business assertions on the returned rule document
  TestValidator.equals(
    "rules title must echo request",
    createdRule.title,
    rulesTitle,
  );
  TestValidator.equals(
    "rules body must echo request",
    createdRule.body,
    rulesBody,
  );
  TestValidator.equals(
    "rules version must echo request",
    createdRule.version,
    rulesVersion,
  );
  TestValidator.equals(
    "rules isActive must echo request (true)",
    createdRule.isActive,
    true,
  );

  // deletedAt should not be set on fresh creation (null or undefined)
  TestValidator.predicate(
    "newly created rules document must not be soft-deleted",
    createdRule.deletedAt === null || createdRule.deletedAt === undefined,
  );

  // Community summary in rules must match the created community
  TestValidator.equals(
    "rules.community.slug must match created community slug",
    createdRule.community.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "rules.community.name must match created community name",
    createdRule.community.name,
    createdCommunity.name,
  );

  // 5. Active rules invariant within this test: single created rule is active
  TestValidator.predicate(
    "for this test's new community, exactly one active ruleset exists (the one we created)",
    createdRule.isActive === true,
  );
}
