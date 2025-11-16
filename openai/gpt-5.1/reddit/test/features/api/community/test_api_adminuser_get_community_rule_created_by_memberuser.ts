import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an adminUser can retrieve a community rule created by a
 * memberUser.
 *
 * Business context:
 *
 * - A regular member user owns communities and can author community-specific
 *   rules.
 * - Platform admins (adminUser) must be able to inspect any community's rules
 *   regardless of membership constraints, for moderation and compliance.
 *
 * Step-by-step flow:
 *
 * 1. Register a memberUser (join) and obtain an authenticated session.
 * 2. As memberUser, create a community with a unique slug and basic configuration.
 * 3. As memberUser, create a rules document for that community.
 * 4. Register an adminUser (join) and obtain an authenticated admin session.
 * 5. As adminUser, fetch the same rules document via the admin rules detail
 *    endpoint.
 * 6. Verify that the admin-visible rule matches the one created by the memberUser
 *    and that the embedded community summary is consistent with the created
 *    community.
 */
export async function test_api_adminuser_get_community_rule_created_by_memberuser(
  connection: api.IConnection,
) {
  // 1. Register memberUser and authenticate
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a community
  const uniqueSlugBase = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: uniqueSlugBase,
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

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. As memberUser, create a rules document for the community
  const ruleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Sanity checks on created rule and its embedded community summary
  TestValidator.equals(
    "created rule community slug matches created community",
    createdRule.community.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "created rule community name matches created community",
    createdRule.community.name,
    createdCommunity.name,
  );
  TestValidator.predicate(
    "created rule community memberCount is non-negative",
    createdRule.community.memberCount >= 0,
  );

  // 4. Register an adminUser and authenticate (join sets Authorization header)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As adminUser, fetch the same community rule via admin endpoint
  const adminViewedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.adminUser.communities.rules.at(
      connection,
      {
        communitySlug: createdCommunity.slug,
        ruleId: createdRule.id,
      },
    );
  typia.assert(adminViewedRule);

  // 6. Cross-check that the admin-visible rule matches the member-created rule
  TestValidator.equals(
    "admin view rule id matches created rule id",
    adminViewedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "admin view rule title matches",
    adminViewedRule.title,
    createdRule.title,
  );
  TestValidator.equals(
    "admin view rule body matches",
    adminViewedRule.body,
    createdRule.body,
  );
  TestValidator.equals(
    "admin view rule version matches",
    adminViewedRule.version,
    createdRule.version,
  );
  TestValidator.equals(
    "admin view rule isActive matches",
    adminViewedRule.isActive,
    createdRule.isActive,
  );

  // 7. Validate embedded community summary consistency in admin view
  TestValidator.equals(
    "admin view community.slug matches created community",
    adminViewedRule.community.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "admin view community.name matches created community",
    adminViewedRule.community.name,
    createdCommunity.name,
  );
  TestValidator.predicate(
    "admin view community.memberCount is non-negative",
    adminViewedRule.community.memberCount >= 0,
  );
}
