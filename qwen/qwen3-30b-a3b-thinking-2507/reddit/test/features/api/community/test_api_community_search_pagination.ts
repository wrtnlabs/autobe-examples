import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
export async function test_api_community_search_pagination(connection: api.IConnection): Promise<void> {
    // Test page 1, limit 5
    const response1: IPageICommunityPlatformCommunity.ISummary = await api.functional.communityPlatform.communities.index(connection, {
        body: {
            page: 1,
            limit: 5,
        }
    });
    typia.assert(response1);
    TestValidator.equals("Page 1 should have 5 items", response1.data.length, 5);
    TestValidator.equals("Page 1 correct current page", response1.pagination.current, 1);
    TestValidator.equals("Page 1 correct limit", response1.pagination.limit, 5);
    // Test page 2, limit 5
    const response2: IPageICommunityPlatformCommunity.ISummary = await api.functional.communityPlatform.communities.index(connection, {
        body: {
            page: 2,
            limit: 5,
        }
    });
    typia.assert(response2);
    TestValidator.equals("Page 2 should have 5 items", response2.data.length, 5);
    TestValidator.equals("Page 2 correct current page", response2.pagination.current, 2);
    TestValidator.equals("Page 2 correct limit", response2.pagination.limit, 5);
    // Test page 3, limit 5 (last page - should have fewer items if not multiple of limit)
    const response3: IPageICommunityPlatformCommunity.ISummary = await api.functional.communityPlatform.communities.index(connection, {
        body: {
            page: 3,
            limit: 5,
        }
    });
    typia.assert(response3);
    TestValidator.equals("Page 3 should have the remaining items", response3.data.length, 5);
    TestValidator.equals("Page 3 correct current page", response3.pagination.current, 3);
    TestValidator.equals("Page 3 correct limit", response3.pagination.limit, 5);
    // Test page 4, limit 5 (out of range - should have no items)
    const response4: IPageICommunityPlatformCommunity.ISummary = await api.functional.communityPlatform.communities.index(connection, {
        body: {
            page: 4,
            limit: 5,
        }
    });
    typia.assert(response4);
    TestValidator.equals("Page 4 should have 0 items (out of range)", response4.data.length, 0);
    TestValidator.equals("Page 4 correct current page", response4.pagination.current, 4);
    TestValidator.equals("Page 4 correct limit", response4.pagination.limit, 5);
    TestValidator.equals("Page 4 correct total records", response4.pagination.records, response1.pagination.records);
    TestValidator.equals("Page 4 correct total pages", response4.pagination.pages, response1.pagination.pages);
}