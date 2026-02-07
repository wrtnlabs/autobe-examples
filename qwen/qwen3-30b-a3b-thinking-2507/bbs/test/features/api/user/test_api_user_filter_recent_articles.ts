import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { prepare_random_economy_politics_board_search_filter } from "../../../prepare/prepare_random_economy_politics_board_search_filter";
import { generate_random_economy_politics_board_user_filters_create } from "../../../generate/generate_random_economy_politics_board_user_filters_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_filter_recent_articles(connection: api.IConnection): Promise<void> {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<IEconomyPoliticsBoardUser.IJoin>(),
    });
    const filter = await api.functional.economyPoliticsBoard.user.filters.create(userConnection, {
        body: {
            filter_name: 'All Recent Articles',
            config: JSON.stringify({
                recent: true
            }),
        }
    });
    const safeFilter = typia.assert<IEconomyPoliticsBoardSearchFilter>(filter);
    TestValidator.equals('filter name', safeFilter.filter_name, 'All Recent Articles');
    TestValidator.equals('recent should be true', safeFilter.config, JSON.stringify({ recent: true }));
}