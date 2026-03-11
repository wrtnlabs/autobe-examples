import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Test 1: Valid UUID format but non-existent ID
  const validNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Non-existent comment returns 404",
    404,
    async () =>
      await api.functional.redditPlatform.comments.at(userConnection, {
        commentId: validNonExistentId,
      }),
  );
  // Test 2: Invalid UUID format - should return 400 for validation error
  const invalidUuid = "not-a-valid-uuid";
  await TestValidator.httpError(
    "Invalid UUID format returns 400",
    400,
    async () =>
      await api.functional.redditPlatform.comments.at(userConnection, {
        commentId: invalidUuid,
      }),
  );
}
