import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUserBan";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_ban_listing_pagination_metadata(connection: api.IConnection): Promise<void> {
    // 1. User authentication
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<IEconomyPoliticsBoardUser.IJoin>(),
    });

    // 2. Retrieve ban list with pagination
    const response = await api.functional.economyPoliticsBoard.user.bans.index(userConnection);
    typia.assert(response);

    // 3. Validate pagination metadata
    const { current, limit, records, pages } = response.pagination;
    TestValidator.predicate("current page is valid", current >= 1);
    TestValidator.predicate("limit is positive", limit > 0);
    TestValidator.predicate("record count is non-negative", records >= 0);
    TestValidator.predicate("page count is non-negative", pages >= 0);
}