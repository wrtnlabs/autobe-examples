import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate uniqueness constraints for community slug and allow duplicate names.
 *
 * Business goals:
 *
 * - Ensure that creating a community with a slug that already exists fails.
 * - Confirm that different communities can share the same name as long as their
 *   slugs are different.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new memberUser using POST /auth/memberUser/join.
 * 2. Create a first community with a unique slug.
 * 3. Attempt to create a second community with the same slug but a different name,
 *    expecting an error.
 * 4. Create a third community with a different slug but the same name as the first
 *    one, expecting success.
 * 5. Validate that the uniqueness constraint is applied only on slug.
 */
export async function test_api_community_creation_slug_and_name_uniqueness_constraints(
  connection: api.IConnection,
) {
  // 1. Register and authenticate memberUser (join)
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Let server infer IP by omitting it.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create first community with a unique slug
  const slugBase = `e2e-unique-slug-${RandomGenerator.alphaNumeric(8)}`;
  const firstCommunityBody = {
    slug: slugBase,
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

  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: firstCommunityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(firstCommunity);

  TestValidator.equals(
    "first community slug should match request",
    firstCommunity.slug,
    firstCommunityBody.slug,
  );
  TestValidator.equals(
    "first community name should match request",
    firstCommunity.name,
    firstCommunityBody.name,
  );

  // 3. Attempt second community with same slug but different name
  const secondCommunityBody = {
    slug: slugBase,
    name: `${firstCommunityBody.name}-duplicate`,
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

  await TestValidator.error("duplicate slug must be rejected", async () => {
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: secondCommunityBody,
      },
    );
  });

  // 4. Create third community with different slug but same name as first
  const thirdCommunityBody = {
    slug: `${slugBase}-alt`,
    name: firstCommunityBody.name,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const thirdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: thirdCommunityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(thirdCommunity);

  TestValidator.equals(
    "third community name should equal first community name",
    thirdCommunity.name,
    firstCommunity.name,
  );
  TestValidator.equals(
    "third community slug should match its request",
    thirdCommunity.slug,
    thirdCommunityBody.slug,
  );
  TestValidator.notEquals(
    "third community slug should differ from first community slug",
    thirdCommunity.slug,
    firstCommunity.slug,
  );
}
