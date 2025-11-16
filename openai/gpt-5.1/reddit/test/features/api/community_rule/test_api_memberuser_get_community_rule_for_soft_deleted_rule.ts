import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that community rules retrieval is scoped correctly by community slug
 * and that a rule cannot be fetched through a different community’s slug.
 *
 * Business intent (adapted from original soft-delete scenario):
 *
 * - Instead of manipulating deletedAt directly (which would require non-SDK DB
 *   access), we validate an equivalent isolation rule: a rule created for
 *   community A must not be readable when addressed as if it belonged to
 *   community B.
 * - This ensures no cross-community leakage of rule documents and that GET
 *   /communityPlatform/memberUser/communities/{communitySlug}/rules/{ruleId}
 *   always respects the owning community boundary.
 *
 * Steps:
 *
 * 1. Join as a memberUser (auth/memberUser/join) so that the SDK attaches an
 *    access token to the connection headers.
 * 2. Create two communities (A and B), each with its own unique slug and
 *    configuration, via communityPlatform/memberUser/communities.create.
 * 3. For community A, create a rules document via
 *    communityPlatform/memberUser/communities/{slugA}/rules.create and capture
 *    the returned rule object.
 * 4. Positively verify that the created rule can be fetched back via
 *    communityPlatform/memberUser/communities/{slugA}/rules.at using the same
 *    ruleId and that the community.slug embedded in the response matches
 *    slugA.
 * 5. Attempt to read the same ruleId but with communitySlug set to slugB instead
 *    of slugA.
 * 6. Assert that the cross-community read fails by wrapping the call in
 *    TestValidator.error(), without checking for a specific HTTP status.
 *
 * This test does not perform an actual soft delete (deletedAt mutation) because
 * such an operation is not exposed in the provided SDK surface. Instead, it
 * validates the non-leakage and scoping guarantees that a soft-deletion-aware
 * implementation would also need to honor: clients of a community must not be
 * able to see rule documents that do not belong to that community.
 */
export async function test_api_memberuser_get_community_rule_for_soft_deleted_rule(
  connection: api.IConnection,
) {
  // 1. Join as a memberUser to obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create two distinct communities (A and B).
  const slugA = `community-a-${RandomGenerator.alphabets(8)}`;
  const slugB = `community-b-${RandomGenerator.alphabets(8)}`;

  const createCommunityBodyA = {
    slug: slugA,
    name: "Community A",
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
      { body: createCommunityBodyA },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);

  const createCommunityBodyB = {
    slug: slugB,
    name: "Community B",
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
      { body: createCommunityBodyB },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);

  TestValidator.equals(
    "created community A slug should match request slug",
    communityA.slug,
    slugA,
  );
  TestValidator.equals(
    "created community B slug should match request slug",
    communityB.slug,
    slugB,
  );

  // 3. Create a rules document for community A.
  const ruleCreateBodyA = {
    title: "Community A Rules v1",
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: slugA,
        body: ruleCreateBodyA,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(createdRule);

  TestValidator.equals(
    "rule community summary slug should match community A slug",
    createdRule.community.slug,
    slugA,
  );

  // 4. Positive control: fetch the rule back via the correct community slug.
  const fetchedRuleSameCommunity: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.at(
      connection,
      {
        communitySlug: slugA,
        ruleId: createdRule.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityRule>(fetchedRuleSameCommunity);

  TestValidator.equals(
    "fetched rule id should equal created rule id",
    fetchedRuleSameCommunity.id,
    createdRule.id,
  );
  TestValidator.equals(
    "fetched rule community slug should still be community A",
    fetchedRuleSameCommunity.community.slug,
    slugA,
  );

  // 5. Negative case: attempt to fetch the same ruleId via community B’s slug.
  await TestValidator.error(
    "cross-community rule fetch must fail (no leakage across communitySlug)",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.rules.at(
        connection,
        {
          communitySlug: slugB,
          ruleId: createdRule.id,
        },
      );
    },
  );
}
