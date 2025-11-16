import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that an authenticated memberUser can retrieve the detailed rules
 * document for a community immediately after creating both the community and
 * its rules, and that the retrieved payload matches the originally created
 * entities.
 *
 * Business flow:
 *
 * 1. Register a new memberUser account (join) which also authenticates the
 *    connection via the returned authorization token.
 * 2. As this memberUser, create a new community with a unique slug and a specific
 *    configuration of visibility/status and posting flags.
 * 3. For that community, create a community rules document with a known title,
 *    body, version and is_active flag.
 * 4. Retrieve the rules document by its communitySlug and ruleId.
 *
 * Validations:
 *
 * - All API responses conform to their respective DTO types (enforced using
 *   typia.assert).
 * - The rules document returned by GET has the same id, title, body, version, and
 *   isActive values as the created rules document.
 * - DeletedAt on the rules document is null/undefined for a freshly created,
 *   non-deleted rules record.
 * - The embedded community summary in the rules record (community field) refers
 *   to the same community created earlier: slug and name match, and high level
 *   flags like isRestricted/visibility-related semantics are consistent.
 */
export async function test_api_memberuser_get_community_rule_after_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new memberUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new community as this memberUser
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
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

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(createdCommunity);

  // Basic sanity check that slug/name match the creation payload
  TestValidator.equals(
    "created community slug matches request",
    createdCommunity.slug,
    communityBody.slug,
  );
  TestValidator.equals(
    "created community name matches request",
    createdCommunity.name,
    communityBody.name,
  );

  // 3. Create a rules document for this community
  const ruleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: createdCommunity.slug,
        body: ruleCreateBody,
      },
    );
  typia.assert(createdRule);

  // Validate created rule aligns with request where field names overlap
  TestValidator.equals(
    "created rule title matches request",
    createdRule.title,
    ruleCreateBody.title,
  );
  TestValidator.equals(
    "created rule body matches request",
    createdRule.body,
    ruleCreateBody.body,
  );
  TestValidator.predicate(
    "created rule version matches request",
    createdRule.version === ruleCreateBody.version,
  );
  TestValidator.equals(
    "created rule isActive matches request is_active",
    createdRule.isActive,
    ruleCreateBody.is_active,
  );

  // deletedAt should be null or undefined for a freshly created rule
  TestValidator.predicate(
    "freshly created rule must not be soft-deleted",
    createdRule.deletedAt === null || createdRule.deletedAt === undefined,
  );

  // Community summary in created rule should reference created community
  TestValidator.equals(
    "rule.community.slug matches created community slug",
    createdRule.community.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "rule.community.name matches created community name",
    createdRule.community.name,
    createdCommunity.name,
  );

  // 4. Retrieve the rule via GET /communities/{communitySlug}/rules/{ruleId}
  const fetchedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.at(
      connection,
      {
        communitySlug: createdCommunity.slug,
        ruleId: createdRule.id,
      },
    );
  typia.assert(fetchedRule);

  // Compare key fields between created and fetched rule
  TestValidator.equals(
    "fetched rule id matches created rule id",
    fetchedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "fetched rule title matches created rule title",
    fetchedRule.title,
    createdRule.title,
  );
  TestValidator.equals(
    "fetched rule body matches created rule body",
    fetchedRule.body,
    createdRule.body,
  );
  TestValidator.equals(
    "fetched rule version matches created rule version",
    fetchedRule.version,
    createdRule.version,
  );
  TestValidator.equals(
    "fetched rule isActive matches created rule isActive",
    fetchedRule.isActive,
    createdRule.isActive,
  );

  // Soft-delete flag remains null/undefined on fetched rule as well
  TestValidator.predicate(
    "fetched rule must not be soft-deleted",
    fetchedRule.deletedAt === null || fetchedRule.deletedAt === undefined,
  );

  // Community summary on fetched rule should match created community
  TestValidator.equals(
    "fetched rule community.slug matches created community slug",
    fetchedRule.community.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "fetched rule community.name matches created community name",
    fetchedRule.community.name,
    createdCommunity.name,
  );
}
