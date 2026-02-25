import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlairAssignment";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test basic search functionality for flair assignments with pagination.
 * 1. Admin registration and authentication
 * 2. Search flair assignments with default pagination settings
 * 3. Validate pagination metadata and handle both empty and populated results
 * 4. Focus on business logic validation rather than redundant type checks
 */
export async function test_api_community_flair_search_basic_pagination(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            permissions_level: null,
        } satisfies ICommunityPlatformAdmin.IJoin,
    });
    typia.assert(admin);

    // Generate a random community ID for the search
    const communityId = typia.random<string & tags.Format<"uuid">>();

    // 2. Search with default pagination (no filters)
    const searchResult = await api.functional.communityPlatform.admin.communities.flair_assignments.index(adminConnection, {
        communityId,
        body: {
            page: null,
            limit: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
    });
    typia.assert(searchResult);

    // 3. Validate pagination metadata (business logic validation only)
    const { pagination, data } = searchResult;

    // Validate pagination calculations are mathematically correct
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals("correct pages calculation", pagination.pages, expectedPages);

    // Validate pagination bounds are logical
    TestValidator.predicate("current page is at least 1", pagination.current >= 1);
    TestValidator.predicate("limit is reasonable", pagination.limit > 0 && pagination.limit <= 1000);
    TestValidator.predicate("records count is consistent", pagination.records >= 0);

    // Validate that data length matches pagination expectations
    if (pagination.records > 0) {
        TestValidator.predicate("data present when records exist", data.length > 0);
        TestValidator.predicate("data length is reasonable", data.length <= pagination.limit);
    } else {
        TestValidator.equals("empty data when no records", data.length, 0);
    }
}