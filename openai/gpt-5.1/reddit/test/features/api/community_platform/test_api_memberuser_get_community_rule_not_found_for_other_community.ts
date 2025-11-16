import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_memberuser_get_community_rule_not_found_for_other_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser
  const joinBody = {
    username: RandomGenerator.name(1),
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

  // 2. Create Community A
  const communitySlugA: string = `community-a-${RandomGenerator.alphaNumeric(8)}`;
  const communityACreate = {
    slug: communitySlugA,
    name: `Community A ${RandomGenerator.name(1)}`,
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
        body: communityACreate,
      },
    );
  typia.assert(communityA);
  TestValidator.equals(
    "created community A slug matches request",
    communityA.slug,
    communitySlugA,
  );

  // 3. Create Community B
  const communitySlugB: string = `community-b-${RandomGenerator.alphaNumeric(8)}`;
  const communityBCreate = {
    slug: communitySlugB,
    name: `Community B ${RandomGenerator.name(1)}`,
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
        body: communityBCreate,
      },
    );
  typia.assert(communityB);
  TestValidator.equals(
    "created community B slug matches request",
    communityB.slug,
    communitySlugB,
  );

  // 4. Create a rule under Community A
  const ruleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: communityA.slug,
        body: ruleCreateBody,
      },
    );
  typia.assert(createdRule);

  // 5. Attempt to fetch the rule via Community B slug (mismatched scoping)
  await TestValidator.error(
    "fetching community A rule via community B slug should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.rules.at(
        connection,
        {
          communitySlug: communityB.slug,
          ruleId: createdRule.id,
        },
      );
    },
  );

  // 6. Positive-path: fetch the rule via the correct communitySlug + ruleId
  const fetchedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.at(
      connection,
      {
        communitySlug: communityA.slug,
        ruleId: createdRule.id,
      },
    );
  typia.assert(fetchedRule);

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
  TestValidator.equals(
    "fetched rule community slug matches community A slug",
    fetchedRule.community.slug,
    communityA.slug,
  );
}
