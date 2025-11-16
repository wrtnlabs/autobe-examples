import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_update_by_administrator_with_null_description(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const administratorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: administratorCredentials,
    },
  );
  typia.assert(administrator);

  // 2. Create member account
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    ip: "127.0.0.1",
    href: "http://localhost:3000/member/join",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // 3. Create category
  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 4. Switch to member and create community with description
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
      href: "http://localhost:3000/member/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.predicate(
    "community has description initially",
    createdCommunity.description !== null &&
      createdCommunity.description !== undefined,
  );

  // 5. Switch to administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorCredentials.email,
      password: administratorCredentials.password,
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 6. Update community to set description to null
  const updateData = {
    description: null,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: createdCommunity.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);

  // 7. Verify description is now null
  TestValidator.equals(
    "description should be null after update",
    updatedCommunity.description,
    null,
  );

  TestValidator.equals(
    "community id should remain same",
    updatedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name should remain same",
    updatedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "community identifier should remain same",
    updatedCommunity.identifier,
    createdCommunity.identifier,
  );
}
