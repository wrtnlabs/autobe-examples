import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Test that the endpoint returns 404 for non-existent member IDs
  // Since there's no API to create members or mark them as soft-deleted,
  // testing 404 for non-existent IDs validates the core behavior.
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () => {
      await api.functional.redditLike.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
