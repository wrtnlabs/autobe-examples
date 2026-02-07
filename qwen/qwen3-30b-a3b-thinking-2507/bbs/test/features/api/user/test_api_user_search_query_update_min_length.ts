import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { prepare_random_economy_politics_board_search_query } from "../../../prepare/prepare_random_economy_politics_board_search_query";
import { generate_random_economy_politics_board_user_queries_create } from "../../../generate/generate_random_economy_politics_board_user_queries_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_search_query_update_min_length(connection: api.IConnection): Promise<void> {
    // 1. User authentication
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            name: RandomGenerator.name(),
        }
    });
    
    // 2. Create initial search query
    const searchQuery = await generate_random_economy_politics_board_user_queries_create(userConnection, {
        body: {
            search_term: "abc",
            request_parameters: null,
        }
    });
    typia.assert(searchQuery);
    
    // 3. Update search query to exactly 3 characters
    const updatedSearchQuery = await api.functional.economyPoliticsBoard.user.queries.update(userConnection, {
        queryId: searchQuery.id,
        body: {
            search_term: "abc",
            request_parameters: JSON.stringify({ sort: "date-desc" }),
        }
    });
    typia.assert(updatedSearchQuery);
    
    // 4. Validate update
    TestValidator.equals("search term matches input", updatedSearchQuery.searchTerm, "abc");
    TestValidator.equals("request parameters match store", updatedSearchQuery.requestParameters, JSON.stringify({ sort: "date-desc" }));
    TestValidator.predicate("length is exactly 3", updatedSearchQuery.searchTerm.length === 3);
}