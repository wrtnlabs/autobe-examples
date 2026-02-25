import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the moderator listing endpoint behavior when requesting moderators
 * for a non-existent community.
 *
 * This test validates that:
 * 1. When the communityName path parameter references a community that does
 *    not exist, the API returns a 404 error
 * 2. The endpoint correctly validates the communityName parameter against
 *    existing communities
 * 3. No pagination data is returned in error cases
 *
 * No prerequisite steps required - this tests error handling for a
 * non-existent community.
 */
export async function test_api_community_moderator_list_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique community name that doesn't exist
  const nonExistentCommunityName =
    "nonexistent_community_" + RandomGenerator.alphaNumeric(10);
  // Test that requesting moderators for a non-existent community returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () =>
      await api.functional.community.communities.moderators.index(connection, {
        communityName: nonExistentCommunityName,
        body: {} satisfies ICommunityModerator.IRequest,
      }),
  );
}
