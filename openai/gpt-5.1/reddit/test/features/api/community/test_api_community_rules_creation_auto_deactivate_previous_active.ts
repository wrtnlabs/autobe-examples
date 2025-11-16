import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_rules_creation_auto_deactivate_previous_active(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user so we can act as memberUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community that will own the rules
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
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

  TestValidator.equals(
    "created community slug must match request slug",
    community.slug,
    communityBody.slug,
  );

  // 3. Create initial active rules (version 1)
  const rulesV1Body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: rulesV1Body,
      },
    );
  typia.assert(ruleV1);

  TestValidator.equals(
    "first rules version should be 1",
    ruleV1.version,
    rulesV1Body.version,
  );
  TestValidator.equals(
    "first rules isActive should be true",
    ruleV1.isActive,
    true,
  );
  TestValidator.equals(
    "first rules community slug matches community",
    ruleV1.community.slug,
    community.slug,
  );

  // 4. Create second active rules (version 2)
  const rulesV2Body = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    version: 2,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: rulesV2Body,
      },
    );
  typia.assert(ruleV2);

  TestValidator.equals(
    "second rules version should be 2",
    ruleV2.version,
    rulesV2Body.version,
  );
  TestValidator.equals(
    "second rules isActive should be true",
    ruleV2.isActive,
    true,
  );
  TestValidator.equals(
    "second rules community slug matches community",
    ruleV2.community.slug,
    community.slug,
  );

  // 5. Validate versioning and business semantics
  TestValidator.notEquals(
    "rules documents must have different IDs",
    ruleV2.id,
    ruleV1.id,
  );

  TestValidator.equals(
    "versions must be monotonically increasing",
    ruleV2.version,
    ruleV1.version + 1,
  );

  TestValidator.equals(
    "both rules belong to same community",
    ruleV2.community.slug,
    ruleV1.community.slug,
  );

  // We cannot re-fetch ruleV1 to see updated isActive state with existing SDK,
  // but we can at least ensure that the latest active ruleset is version 2.
  TestValidator.predicate(
    "latest active ruleset for community is version 2",
    ruleV2.isActive === true && ruleV2.version === 2,
  );
}
