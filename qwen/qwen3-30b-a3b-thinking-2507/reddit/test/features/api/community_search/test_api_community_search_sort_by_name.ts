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
export async function test_api_community_search_sort_by_name(connection: api.IConnection): Promise<void> {
    // Query for communities sorted by name in ascending order
    const result = await api.functional.communityPlatform.communities.search.index(connection, {
        body: {
            sortBy: "name",
            sortDirection: "asc",
            page: 1,
            limit: 5,
        }
    });
    // Verify there are results
    TestValidator.predicate("Results contain at least one community", result.data.length > 0);
    // Extract names from results
    const names = result.data.map((community) => community.name);
    // Validate names are sorted alphabetically
    const sortedNames = [...names].sort();
    TestValidator.equals("Communities sorted by name in ascending order", names, sortedNames);
}