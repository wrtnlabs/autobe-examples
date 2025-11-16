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

export async function test_api_adminuser_get_community_rule_with_wrong_slug_or_ruleid(
  connection: api.IConnection,
) {
  // 1. Member join to prepare an authenticated memberUser context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create Community A
  const communitySlugA: string = `community-a-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBodyA = {
    slug: communitySlugA,
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBodyA,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);

  // 3. Create Community B
  const communitySlugB: string = `community-b-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBodyB = {
    slug: communitySlugB,
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBodyB,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);

  // Ensure slugs are distinct for sanity
  TestValidator.notEquals(
    "community slugs must differ",
    communityA.slug,
    communityB.slug,
  );

  // 4. Create a rules document under Community A
  const ruleCreateBodyA = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleA: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: communitySlugA,
        body: ruleCreateBodyA,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(ruleA);

  const ruleIdA: string = ruleA.id;

  // 5. Admin join to obtain an adminUser context
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies Format<"password"> as arbitrary string
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 6. Positive control: correct pairing should succeed
  const fetchedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.adminUser.communities.rules.at(
      connection,
      {
        communitySlug: communitySlugA,
        ruleId: ruleIdA,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(fetchedRule);

  TestValidator.equals(
    "fetched rule id should match created rule id",
    fetchedRule.id,
    ruleIdA,
  );
  TestValidator.equals(
    "fetched rule community slug should match community A slug",
    fetchedRule.community.slug,
    communitySlugA,
  );

  // 7. Negative: mismatched communitySlug and ruleId should be not-found (404)
  await TestValidator.httpError(
    "mismatched communitySlug and ruleId should respond with 404",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.at(
        connection,
        {
          communitySlug: communitySlugB,
          ruleId: ruleIdA,
        },
      );
    },
  );

  // 8. Negative: completely unknown ruleId under an existing community
  const unknownRuleId: string = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "unknown ruleId under existing community should respond with 404",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.at(
        connection,
        {
          communitySlug: communitySlugA,
          ruleId: unknownRuleId,
        },
      );
    },
  );

  // 9. Negative: unknown communitySlug with existing ruleId
  const unknownCommunitySlug: string = `unknown-${RandomGenerator.alphaNumeric(10)}`;

  // Safety: ensure unknown slug does not collide with existing ones (very unlikely but asserted for clarity)
  TestValidator.notEquals(
    "unknown community slug must differ from community A",
    unknownCommunitySlug,
    communitySlugA,
  );
  TestValidator.notEquals(
    "unknown community slug must differ from community B",
    unknownCommunitySlug,
    communitySlugB,
  );

  await TestValidator.httpError(
    "unknown communitySlug with existing ruleId should respond with 404",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.communities.rules.at(
        connection,
        {
          communitySlug: unknownCommunitySlug,
          ruleId: ruleIdA,
        },
      );
    },
  );
}
