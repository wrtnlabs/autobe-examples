import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * E2E test: Update community attributes by the community creator.
 *
 * Business intent:
 *
 * - Verify that the user who created a community can update its mutable fields
 *   (name, slug, description, is_private, visibility).
 * - Verify slug uniqueness is enforced when changed.
 * - Verify ownership enforcement: other members cannot update the community.
 * - Ensure created_at remains unchanged and updated_at is refreshed.
 *
 * Steps:
 *
 * 1. Register a creator member (POST /auth/member/join).
 * 2. Create a community as the creator (POST /communityPortal/member/communities).
 * 3. Update the community as creator (PUT
 *    /communityPortal/member/communities/{communityId}).
 * 4. Assert returned resource reflects updated values, created_at preserved,
 *    updated_at changed.
 * 5. Create a second member and a second community with a chosen slug.
 * 6. Attempt to change the first community's slug to the second community's slug
 *    and assert the update fails (slug uniqueness conflict).
 * 7. Attempt to update the first community with the second member and assert the
 *    update fails (ownership/permission enforced).
 */
export async function test_api_community_update_by_creator(
  connection: api.IConnection,
) {
  // 1) Create isolated connection contexts for separate authenticated members
  const creatorConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  // 2) Register creator member
  const creatorUsername = RandomGenerator.alphaNumeric(8);
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = "P@ssw0rd-" + RandomGenerator.alphaNumeric(6);
  const creator: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(creatorConn, {
      body: {
        username: creatorUsername,
        email: creatorEmail,
        password: creatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(creator);

  // 3) Creator creates an initial community
  const initialName = RandomGenerator.name(2);
  const initialSlug = `${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const initialDescription = RandomGenerator.paragraph({ sentences: 6 });
  const initialPrivate = false;
  const initialVisibility = "public";

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(
      creatorConn,
      {
        body: {
          name: initialName,
          slug: initialSlug,
          description: initialDescription,
          is_private: initialPrivate,
          visibility: initialVisibility,
        } satisfies ICommunityPortalCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4) Update the community as the creator
  const updatedName = RandomGenerator.name(3);
  const updatedSlug = `${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 8 });
  const updatedIsPrivate = !community.is_private;
  const updatedVisibility =
    community.visibility === "public" ? "private" : "public";

  const updated: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.update(
      creatorConn,
      {
        communityId: community.id,
        body: {
          name: updatedName,
          slug: updatedSlug,
          description: updatedDescription,
          is_private: updatedIsPrivate,
          visibility: updatedVisibility,
        } satisfies ICommunityPortalCommunity.IUpdate,
      },
    );
  typia.assert(updated);

  // Validate updated fields and timestamps
  TestValidator.equals("community name updated", updated.name, updatedName);
  TestValidator.equals("community slug updated", updated.slug, updatedSlug);
  TestValidator.equals(
    "community description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "community is_private updated",
    updated.is_private,
    updatedIsPrivate,
  );
  TestValidator.equals(
    "community visibility updated",
    updated.visibility,
    updatedVisibility,
  );

  // created_at should be preserved
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    community.created_at,
  );

  // updated_at should have changed
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    community.updated_at,
  );

  // 5) Prepare second member and a second community with deterministic slug
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = "P@ssw0rd-" + RandomGenerator.alphaNumeric(6);

  const otherMember: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, {
      body: {
        username: otherUsername,
        email: otherEmail,
        password: otherPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(otherMember);

  const conflictingSlug = `${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const otherCommunity: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(otherConn, {
      body: {
        name: RandomGenerator.name(2),
        slug: conflictingSlug,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(otherCommunity);

  // 6) Attempt to change the first community's slug to the second community's slug
  await TestValidator.error("slug uniqueness enforced on update", async () => {
    await api.functional.communityPortal.member.communities.update(
      creatorConn,
      {
        communityId: community.id,
        body: {
          slug: conflictingSlug,
        } satisfies ICommunityPortalCommunity.IUpdate,
      },
    );
  });

  // 7) Authorization: other member (non-creator) tries to update the creator's community
  await TestValidator.error("non-creator cannot update community", async () => {
    await api.functional.communityPortal.member.communities.update(otherConn, {
      communityId: community.id,
      body: {
        name: "unauthorized-change",
      } satisfies ICommunityPortalCommunity.IUpdate,
    });
  });
}
