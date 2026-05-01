import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
/**
 * Test that requesting a non-existent community returns 404 Not Found.
 *
 * Validates the endpoint behavior when a community name does not exist in the
 * system. The endpoint is publicly accessible without authentication, so no
 * prerequisite operations are needed.
 *
 * Soft-deleted communities are excluded at the query level (WHERE deleted_at
 * IS NULL) and also result in a 404 response, making them indistinguishable
 * from never-created communities to external callers.
 *
 * 1. Generate a unique community name guaranteed not to exist using a random suffix.
 * 2. Call GET /communityHub/communities/{nonExistentName} without authentication.
 * 3. Assert the response is a 404 HttpError.
 */
export async function test_api_community_view_not_found(connection: api.IConnection): Promise<void>
{
    // Generate a guaranteed non-existent community name
    const nonExistentName = `NonExistentCommunity_${RandomGenerator.alphaNumeric(16)}`;
    // Verify 404 for non-existent community
    await TestValidator.httpError("non-existent community returns 404", 404, async () =>
    {
        await api.functional.communityHub.communities.at(connection, {
            communityName: nonExistentName,
        });
    });
}