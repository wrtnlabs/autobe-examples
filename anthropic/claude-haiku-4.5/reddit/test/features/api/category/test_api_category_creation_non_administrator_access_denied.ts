import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_non_administrator_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account (required by dependency)
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) + "Aa1!",
    username: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a non-administrator member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(8) + "Aa1!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/auth/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 3: Attempt to create a category as a non-administrator member
  // The member's token is now in the connection headers from the join call
  // This should fail with 403 Forbidden because only administrators can create categories
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  // The member token is already set in connection.headers from the join call
  // This API call will use the member's authentication and should return 403 Forbidden
  await TestValidator.httpError(
    "non-administrator member cannot create category",
    403,
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: categoryData,
        },
      );
    },
  );
}
