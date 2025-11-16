import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_rules_update_toggle_active_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user so that subsequent
  // communityPlatform/memberUser operations are authorized.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community that will own the rules documents.
  const communityBody = {
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
        body: communityBody,
      },
    );
  typia.assert(community);

  const communitySlug = community.slug;

  // 3. Create two rules records within this community.
  // 3-1. Version 1, initially active.
  const ruleV1Body = {
    title: "Community Rules v1",
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug,
        body: ruleV1Body,
      },
    );
  typia.assert(ruleV1);

  TestValidator.equals(
    "version 1 rule should report version=1 and isActive=true",
    ruleV1.version,
    1,
  );
  TestValidator.equals(
    "version 1 rule community slug should match created community",
    ruleV1.community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "version 1 rule initially active",
    ruleV1.isActive,
    true,
  );

  // 3-2. Version 2, initially inactive (draft state).
  const ruleV2Body = {
    title: "Community Rules v2",
    body: RandomGenerator.content({ paragraphs: 3 }),
    version: 2,
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const ruleV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug,
        body: ruleV2Body,
      },
    );
  typia.assert(ruleV2);

  TestValidator.equals(
    "version 2 rule should report version=2 and isActive=false",
    ruleV2.version,
    2,
  );
  TestValidator.equals(
    "version 2 rule community slug should match created community",
    ruleV2.community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "version 2 rule initially inactive",
    ruleV2.isActive,
    false,
  );

  // 4. Activate the second ruleset via PUT update with is_active=true.
  const activateV2Body = {
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const activatedV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.update(
      connection,
      {
        communitySlug,
        ruleId: ruleV2.id,
        body: activateV2Body,
      },
    );
  typia.assert(activatedV2);

  // 5. Assert that the updated rule is version 2 and now active, with
  // community slug preserved.
  TestValidator.equals(
    "activated rule should still be version 2",
    activatedV2.version,
    2,
  );
  TestValidator.equals(
    "activated rule should now be active",
    activatedV2.isActive,
    true,
  );
  TestValidator.equals(
    "activated rule community slug should match created community",
    activatedV2.community.slug,
    communitySlug,
  );

  // NOTE: The backend is responsible for ensuring that only one rules
  // record per community is active at any time. However, we do not have
  // a listing or lookup endpoint for all rules of the community in this
  // SDK surface, so we cannot re-fetch ruleV1 to confirm its isActive flag.
  // Instead, we rely on the update documentation and type-level guarantees
  // while verifying that the target rule has become active.

  // 7. Optionally, deactivate the second ruleset again and verify the
  // direct record-level behavior.
  const deactivateV2Body = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const deactivatedV2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.update(
      connection,
      {
        communitySlug,
        ruleId: ruleV2.id,
        body: deactivateV2Body,
      },
    );
  typia.assert(deactivatedV2);

  TestValidator.equals(
    "deactivated version 2 rule should have isActive=false",
    deactivatedV2.isActive,
    false,
  );
  TestValidator.equals(
    "deactivated version 2 rule still has version=2",
    deactivatedV2.version,
    2,
  );
  TestValidator.equals(
    "deactivated version 2 rule community slug should match created community",
    deactivatedV2.community.slug,
    communitySlug,
  );
}
