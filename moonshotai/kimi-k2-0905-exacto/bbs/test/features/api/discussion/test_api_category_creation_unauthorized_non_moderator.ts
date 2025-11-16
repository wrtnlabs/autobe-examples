import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_category_creation_unauthorized_non_moderator(
  connection: api.IConnection,
) {
  // Create regular member account without moderator privileges
  const memberData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Try to create category using regular member credentials (should fail)
  const categoryData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  await TestValidator.error(
    "category creation by non-moderator should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: categoryData,
        },
      );
    },
  );

  // Verify member is still authenticated but unauthorized for category creation
  TestValidator.equals(
    "member authentication context preserved",
    member.member.username,
    memberData.username,
  );
}
