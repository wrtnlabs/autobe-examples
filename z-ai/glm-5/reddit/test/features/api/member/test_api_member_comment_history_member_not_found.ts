import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a member's comment history when the member does not exist.
 *
 * This test verifies that the API properly handles requests for non-existent
 * members by returning an HTTP 404 Not Found error.
 *
 * @param connection - The base connection to the API server
 */
export async function test_api_member_comment_history_member_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve comment history for non-existent member
  // Expected: HTTP 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () =>
      await api.functional.communityPlatform.members.comments.search(
        connection,
        {
          memberId: nonExistentMemberId,
        },
      ),
  );
}
