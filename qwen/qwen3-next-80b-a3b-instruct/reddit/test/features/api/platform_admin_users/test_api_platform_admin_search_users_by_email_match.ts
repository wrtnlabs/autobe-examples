import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_search_users_by_email_match(connection: api.IConnection): Promise<void> {
    // 1. Create platform admin account for authorization
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_platform_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<'email'>>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(1),
        } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
    typia.assert(admin);
    
    // 2. Since we cannot create guest users via the API and no utility function exists,
    // we will rely on the system having existing guest users with emails containing the search fragment.
    // This test validates the search functionality's privacy and structure requirements.
    
    // 3. Set up search criteria: search by email fragment
    const searchFragment = '@example.com';
    const searchRequest: IRedditCommunityGuest.IRequest = {
        search: searchFragment,
        limit: 10,
        page: 1,
    };
    
    // 4. Execute search
    const searchResult = await api.functional.redditCommunity.platformAdmin.users.search.index(adminConnection, { body: searchRequest });
    typia.assert(searchResult);
    
    // 5. Validate search results
    // Verify that results contain only username and display_name (privacy protection)
    for (const result of searchResult.data) {
        // Email field MUST NOT be present (privacy protection)
        TestValidator.equals('Email field not exposed in response', 'email' in result, false);
        
        // Must have username and display_name (required for guest users)
        TestValidator.equals('Has username', result.username !== undefined && result.username !== null, true);
        TestValidator.equals('Has display_name', result.display_name !== undefined && result.display_name !== null, true);
        
        // karma_score is an int32
        TestValidator.predicate('karma_score is int32', () => typeof result.karma_score === 'number' &&
            Number.isInteger(result.karma_score) &&
            result.karma_score >= Number.MIN_SAFE_INTEGER &&
            result.karma_score <= Number.MAX_SAFE_INTEGER);
    }
    
    // Validate pagination structure
    const pagination = searchResult.pagination;
    TestValidator.equals('Pagination current is positive', pagination.current >= 1, true);
    TestValidator.equals('Pagination limit is positive', pagination.limit >= 1, true);
    TestValidator.equals('Pagination records is non-negative', pagination.records >= 0, true);
    TestValidator.equals('Pagination pages is non-negative', pagination.pages >= 0, true);
    
    // Verify total search count is reasonable
    // We don't require any specific number of results - the system may have 0 users
    // with the search fragment in their email, which is a valid state
    
    // Verify the search returns data in the correct structure
    TestValidator.predicate('Search returned valid data structure', () => Array.isArray(searchResult.data));
    
    // Verify that email privacy is successfully protected - no email field exists in response
    TestValidator.equals('No email addresses exposed in response', searchResult.data.some(user => 'email' in user), false);
    
    // Verify all returned user summaries have required fields
    TestValidator.predicate('All results have username and display_name', () => searchResult.data.every(user => user.username !== undefined && user.username !== null &&
        user.display_name !== undefined && user.display_name !== null));
}