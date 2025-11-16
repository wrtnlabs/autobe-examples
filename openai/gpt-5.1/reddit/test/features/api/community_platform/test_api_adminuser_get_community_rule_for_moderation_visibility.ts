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
 * Verify that an adminUser can retrieve both current (active) and prior
 * (inactive) rule versions for a community, enabling moderation and audit
 * visibility.
 *
 * Business flow:
 *
 * 1. Register a memberUser (join) and rely on automatic authentication.
 * 2. As the authenticated memberUser, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. Still as the memberUser, create the first rules document (version 1, active)
 *    for the community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/rules.
 * 4. Create a second rules document (version 2, active) for the same community.
 *    Business logic is expected to make only one version active at a time, so
 *    v2 should be the active one, and v1 should become inactive.
 * 5. Register an adminUser via POST /auth/adminUser/join (this also
 *    authenticates).
 * 6. Optionally log in again as adminUser via POST /auth/adminUser/login to
 *    confirm header switching behavior is solid.
 * 7. As the authenticated adminUser, call GET
 *    /communityPlatform/adminUser/communities/{communitySlug}/rules/{ruleId}
 *    for both v1 and v2 rule IDs.
 *
 * Validations:
 *
 * - Both admin GET calls succeed and return ICommunityPlatformCommunityRule
 *   instances that pass typia.assert.
 * - The community summary on both rules references the same community, matching
 *   the slug and name of the created community.
 * - The rule versions differ and match what we created (1 and 2).
 * - Exactly one of the two rules is currently active (isActive === true) so that
 *   the system enforces a single active ruleset; the other should have isActive
 *   === false or at least not both be true.
 * - AdminUser can see both the older and newer rule versions regardless of their
 *   active/inactive state, validating historical visibility.
 *
 * The test must never manipulate connection.headers directly; all auth
 * switching is done via SDK join/login functions which manage Authorization
 * automatically.
 */
export async function test_api_adminuser_get_community_rule_for_moderation_visibility(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communityCreateBody.slug,
  );
  TestValidator.equals(
    "created community name should match requested name",
    community.name,
    communityCreateBody.name,
  );

  // 3. Create first rules document (version 1, active)
  const ruleV1CreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleV1CreateBody,
      },
    );
  typia.assert(ruleV1);

  TestValidator.equals(
    "rule v1 version should be 1",
    ruleV1.version,
    ruleV1CreateBody.version,
  );
  TestValidator.equals(
    "rule v1 title should match creation payload",
    ruleV1.title,
    ruleV1CreateBody.title,
  );
  TestValidator.equals(
    "rule v1 community slug should match community",
    ruleV1.community.slug,
    community.slug,
  );

  // 4. Create second rules document (version 2, active)
  const ruleV2CreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    version: 2,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleV2CreateBody,
      },
    );
  typia.assert(ruleV2);

  TestValidator.equals(
    "rule v2 version should be 2",
    ruleV2.version,
    ruleV2CreateBody.version,
  );
  TestValidator.equals(
    "rule v2 title should match creation payload",
    ruleV2.title,
    ruleV2CreateBody.title,
  );
  TestValidator.equals(
    "rule v2 community slug should match community",
    ruleV2.community.slug,
    community.slug,
  );

  TestValidator.notEquals(
    "rule v1 and v2 IDs must differ",
    ruleV1.id,
    ruleV2.id,
  );

  // 5. Register an adminUser (join) and authenticate
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 6. Optionally re-login as adminUser to verify token switching
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin id should be stable between join and login",
    adminAuthorizedFromLogin.id,
    adminAuthorizedFromJoin.id,
  );

  // 7. As adminUser, fetch both rules by ID
  const adminViewRuleV1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.adminUser.communities.rules.at(
      connection,
      {
        communitySlug: community.slug,
        ruleId: ruleV1.id,
      },
    );
  typia.assert(adminViewRuleV1);

  const adminViewRuleV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.adminUser.communities.rules.at(
      connection,
      {
        communitySlug: community.slug,
        ruleId: ruleV2.id,
      },
    );
  typia.assert(adminViewRuleV2);

  // Validate community summary alignment
  TestValidator.equals(
    "admin view rule v1 community slug should match original community",
    adminViewRuleV1.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "admin view rule v1 community name should match original community",
    adminViewRuleV1.community.name,
    community.name,
  );
  TestValidator.equals(
    "admin view rule v2 community slug should match original community",
    adminViewRuleV2.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "admin view rule v2 community name should match original community",
    adminViewRuleV2.community.name,
    community.name,
  );

  // Validate version numbers and that they are distinct
  TestValidator.equals(
    "admin view rule v1 version should be 1",
    adminViewRuleV1.version,
    1,
  );
  TestValidator.equals(
    "admin view rule v2 version should be 2",
    adminViewRuleV2.version,
    2,
  );
  TestValidator.notEquals(
    "admin view rule v1 and v2 IDs must differ",
    adminViewRuleV1.id,
    adminViewRuleV2.id,
  );

  // Validate isActive semantics — ensure not both are active
  const bothActive = adminViewRuleV1.isActive && adminViewRuleV2.isActive;
  TestValidator.predicate(
    "not both rule versions can be active simultaneously",
    !bothActive,
  );

  // At least one should be active (typically v2)
  const anyActive = adminViewRuleV1.isActive || adminViewRuleV2.isActive;
  TestValidator.predicate(
    "at least one rule version should be active",
    anyActive,
  );
}
