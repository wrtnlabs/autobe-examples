import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate retrieval of an inactive community rules version by memberUser.
 *
 * Business goal
 *
 * - Ensure that a memberUser can fetch a historical (inactive) rules document by
 *   its ruleId even after a newer version has been created and marked active.
 * - Ensure that the rules detail response still contains the original content
 *   (title/body/version) and accurately reports isActive=false for the older
 *   version when business logic deactivates it.
 * - Ensure that ruleId scoping by communitySlug is enforced so that rules cannot
 *   be retrieved under a different community.
 *
 * High-level flow
 *
 * 1. Register and authenticate a memberUser via POST /auth/memberUser/join.
 * 2. Create a community via POST /communityPlatform/memberUser/communities.
 * 3. Create an initial rules document (version 1, is_active=true) for that
 *    community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/rules.
 * 4. Create a second rules document (version 2, is_active=true) for the same
 *    community, expecting business logic to deactivate the previous one.
 * 5. Fetch the first rule by GET
 *    /communityPlatform/memberUser/communities/{communitySlug}/rules/{ruleIdV1}.
 * 6. Validate that:
 *
 *    - Response matches ICommunityPlatformCommunityRule.
 *    - The version and content correspond to the v1 payload.
 *    - IsActive is false for v1 after v2 has been created.
 *    - The embedded community summary references the same community slug and id.
 * 7. Negative: create a second community and verify that v1's ruleId is not
 *    resolvable under the second community's slug via TestValidator.error.
 */
export async function test_api_memberuser_get_inactive_community_rule_version(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community owned by this memberUser.
  const communitySlug = `test-${RandomGenerator.alphaNumeric(12)}`;

  const createCommunityBody = {
    slug: communitySlug,
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Create initial rules document v1 (active).
  const ruleV1Body = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1 as number & tags.Type<"int32">,
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
    "rule v1 version should be 1",
    ruleV1.version,
    ruleV1Body.version,
  );
  TestValidator.equals(
    "rule v1 title should match creation payload",
    ruleV1.title,
    ruleV1Body.title,
  );

  const ruleV1Id = ruleV1.id;

  // 4. Create second rules document v2 (active), expecting v1 to become inactive.
  const ruleV2Body = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 2 as number & tags.Type<"int32">,
    is_active: true,
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
    "rule v2 version should be 2",
    ruleV2.version,
    ruleV2Body.version,
  );
  TestValidator.equals("rule v2 should be active", ruleV2.isActive, true);

  // 5. Fetch v1 by id through GET /communities/{slug}/rules/{ruleId}.
  const fetchedV1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.at(
      connection,
      {
        communitySlug,
        ruleId: ruleV1Id,
      },
    );
  typia.assert(fetchedV1);

  // 6. Validate content and inactive status of v1.
  TestValidator.equals(
    "fetched v1 should keep its original title",
    fetchedV1.title,
    ruleV1Body.title,
  );
  TestValidator.equals(
    "fetched v1 should keep its original body",
    fetchedV1.body,
    ruleV1Body.body,
  );
  TestValidator.equals(
    "fetched v1 should keep its version number",
    fetchedV1.version,
    ruleV1Body.version,
  );

  TestValidator.equals(
    "v1 rule should be inactive after v2 creation",
    fetchedV1.isActive,
    false,
  );

  // Validate that the embedded community summary matches the created community.
  TestValidator.equals(
    "community summary id in rule should match created community id",
    fetchedV1.community.id,
    community.id,
  );
  TestValidator.equals(
    "community summary slug in rule should match created community slug",
    fetchedV1.community.slug,
    community.slug,
  );

  // 7. Negative: create another community and ensure ruleV1 is not visible under it.
  const otherCommunitySlug = `other-${RandomGenerator.alphaNumeric(12)}`;

  const otherCommunityBody = {
    slug: otherCommunitySlug,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const otherCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: otherCommunityBody },
    );
  typia.assert(otherCommunity);

  TestValidator.equals(
    "second community slug should match requested",
    otherCommunity.slug,
    otherCommunitySlug,
  );

  // Attempt to fetch ruleV1 under otherCommunitySlug should fail.
  await TestValidator.error(
    "rule id from first community must not be accessible via second community slug",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.rules.at(
        connection,
        {
          communitySlug: otherCommunitySlug,
          ruleId: ruleV1Id,
        },
      );
    },
  );
}
