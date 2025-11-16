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
 * Ensure community rules cannot be deleted by unauthenticated or non-admin
 * actors.
 *
 * Business goal:
 *
 * - Verify that the admin-only delete endpoint for community rules enforces
 *   role-based access control.
 * - A rule created for a community must not be deletable via the admin delete
 *   route when the caller is either unauthenticated or authenticated only as a
 *   memberUser.
 * - Only an authenticated adminUser should be able to successfully erase the
 *   rule.
 *
 * High-level steps:
 *
 * 1. Register and authenticate a memberUser.
 * 2. As that memberUser, create a community.
 * 3. As the same memberUser, create a rules document for this community.
 * 4. Attempt to delete the rule via the adminUser erase endpoint with an
 *    unauthenticated connection; expect an error.
 * 5. Attempt to delete the rule via the adminUser erase endpoint while
 *    authenticated as a memberUser; expect an error.
 * 6. Authenticate as an adminUser.
 * 7. As the adminUser, delete the rule successfully.
 * 8. Rely on the successful admin deletion to infer that the prior unauthorized
 *    attempts did not delete the rule.
 */
export async function test_api_community_rule_delete_with_insufficient_privileges(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser via join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this memberUser
  const communitySlug: string = RandomGenerator.alphaNumeric(12);

  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 12,
    }),
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Create a rules document for the community as the same memberUser
  const ruleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    version: 1,
    is_active: true,
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

  const ruleId: string = rule.id;

  // 4. Attempt to delete the rule with an unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated delete of community rule should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.erase(
        unauthConnection,
        {
          communitySlug: community.slug,
          ruleId,
        },
      );
    },
  );

  // 5. Attempt to delete the rule while authenticated only as memberUser
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  await TestValidator.error(
    "memberUser calling admin-only erase endpoint should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.erase(
        connection,
        {
          communitySlug: community.slug,
          ruleId,
        },
      );
    },
  );

  // 6. Authenticate as an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. Delete the rule successfully as adminUser
  await api.functional.communityPlatform.adminUser.communities.rules.erase(
    connection,
    {
      communitySlug: community.slug,
      ruleId,
    },
  );

  // 8. Basic predicate to confirm flow reached successful admin deletion
  await TestValidator.predicate(
    "adminUser should be able to delete community rule after prior unauthorized attempts",
    true,
  );
}
