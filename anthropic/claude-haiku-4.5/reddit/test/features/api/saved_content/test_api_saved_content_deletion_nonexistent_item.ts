import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_saved_content_deletion_nonexistent_item(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorized);

  // Step 2: Attempt to delete non-existent saved content item
  const nonExistentSavedId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when deleting non-existent saved item",
    async () => {
      await api.functional.communityPlatform.member.members.saved.erase(
        connection,
        {
          memberId: authorized.id,
          savedId: nonExistentSavedId,
        },
      );
    },
  );
}
