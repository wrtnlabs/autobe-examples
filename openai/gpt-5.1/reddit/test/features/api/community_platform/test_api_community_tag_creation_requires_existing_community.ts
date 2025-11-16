import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";

/**
 * Verify that community tag creation by a moderator fails when targeting a
 * non-existent community identifier, while succeeding for a (simulated)
 * existing community under the same authenticated session.
 *
 * Business context:
 *
 * - Community tags are scoped to an existing community row in
 *   community_platform_communities.
 * - The create endpoint resolves the parent community from the
 *   communityIdentifier path parameter.
 * - If the community does not exist (or is not active), the service should reject
 *   tag creation with an HTTP error instead of silently creating a dangling
 *   tag.
 *
 * Test flow:
 *
 * 1. Join as a community moderator via /auth/communityModerator/join to obtain an
 *    authenticated moderator context (token is installed automatically on the
 *    shared connection by the SDK).
 * 2. Pick a communityIdentifier that is extremely unlikely to exist (e.g. a random
 *    UUID string).
 * 3. Attempt to create a community tag under this non-existent identifier using a
 *    valid ICommunityPlatformCommunityTag.ICreate request body and assert that
 *    the call fails using TestValidator.error (without asserting specific HTTP
 *    status codes).
 * 4. Then, as a control, pick a different communityIdentifier (e.g. a random
 *    human-readable slug) and call the same tag creation endpoint again – in
 *    simulation mode this will always succeed, returning a
 *    ICommunityPlatformCommunityTag object, so validate it with typia.assert
 *    and a few sanity checks using TestValidator.
 *
 * NOTE: We do not test specific 404/409 status codes; we only validate that the
 * service rejects tag creation when the community cannot be resolved, while the
 * same payload succeeds for another identifier under simulation.
 */
export async function test_api_community_tag_creation_requires_existing_community(
  connection: api.IConnection,
) {
  // 1. Ensure we are not in simulation for the negative path expectations
  //    (behavioral check will still work even if simulate is true, but we
  //    focus on error vs success behavior rather than concrete codes).

  // 2. Join as a community moderator; this also installs the Authorization
  //    header on the provided connection.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(moderator);

  // 3. Attempt to create a tag for a clearly non-existent community.
  const nonExistingCommunityIdentifier: string = typia.random<
    string & tags.Format<"uuid">
  >();

  const invalidTagBody = {
    label: RandomGenerator.paragraph({ sentences: 2 }),
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  await TestValidator.error(
    "creating tag for non-existent community must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.create(
        connection,
        {
          communityIdentifier: nonExistingCommunityIdentifier,
          body: invalidTagBody,
        },
      );
    },
  );

  // 4. Control case: create a tag for another identifier that is intended to
  //    represent an existing community (under simulation this always succeeds).
  const existingLikeCommunityIdentifier: string = `community-${RandomGenerator.alphaNumeric(12)}`;

  const validTagBody = {
    label: RandomGenerator.paragraph({ sentences: 1 }),
    slug: `tag-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const createdTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: existingLikeCommunityIdentifier,
        body: validTagBody,
      },
    );

  typia.assert<ICommunityPlatformCommunityTag>(createdTag);

  // Basic business sanity checks on the created tag.
  TestValidator.equals(
    "created tag label should match input label",
    createdTag.label,
    validTagBody.label,
  );
  if (validTagBody.slug !== undefined) {
    TestValidator.equals(
      "created tag slug should match input slug when provided",
      createdTag.slug,
      validTagBody.slug,
    );
  }
  TestValidator.predicate(
    "created tag must be visible when isVisible is true",
    createdTag.isVisible === true,
  );
}
