import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_update_visibility_toggle(
  connection: api.IConnection,
) {
  // 1. Create member account (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphabets(10);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: creatorPassword,
        href: "http://localhost:3000/auth/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);
  TestValidator.predicate("creator account created", creator.id !== null);

  // 2. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(8),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created",
    administrator.id !== null,
  );

  // 3. Create category for community
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created", category.id !== null);

  // 4. Switch to creator context and create public community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial community visibility is public",
    community.visibility,
    "public",
  );
  TestValidator.predicate(
    "community created with correct identifier",
    community.identifier === communityData.identifier,
  );

  // 5. Toggle visibility from public to private
  const updateToPrivate = {
    visibility: "private" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const privateCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateToPrivate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "community visibility toggled to private",
    privateCommunity.visibility,
    "private",
  );
  TestValidator.predicate(
    "updated_at timestamp changed on visibility update",
    new Date(privateCommunity.updated_at) > new Date(community.updated_at),
  );

  // 6. Toggle visibility back from private to public
  const updateToPublic = {
    visibility: "public" as const,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateToPublic,
      },
    );
  typia.assert(publicCommunity);
  TestValidator.equals(
    "community visibility toggled back to public",
    publicCommunity.visibility,
    "public",
  );
  TestValidator.predicate(
    "final updated_at timestamp is newer",
    new Date(publicCommunity.updated_at) >=
      new Date(privateCommunity.updated_at),
  );

  // 7. Validate community integrity throughout visibility changes
  TestValidator.equals(
    "community id remains consistent",
    publicCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier remains immutable",
    publicCommunity.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "community name unchanged",
    publicCommunity.name,
    community.name,
  );

  // 8. Validate creator remains the same
  TestValidator.equals(
    "creator id unchanged",
    publicCommunity.creator.id,
    community.creator.id,
  );
  TestValidator.equals(
    "creator username unchanged",
    publicCommunity.creator.username,
    community.creator.username,
  );
}
