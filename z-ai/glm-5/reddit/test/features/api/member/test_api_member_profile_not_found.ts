import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Test that requesting a non-existent member returns 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () => {
      await api.functional.communityPlatform.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
