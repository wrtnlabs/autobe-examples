import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_search_query_erase_already_deleted(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as user
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, { body: {} });

    // 2. Delete a search query (already soft-deleted, should succeed idempotently)
    const output = await api.functional.economyPoliticsBoard.user.queries.erase(userConnection, {
        queryId: typia.random<string & tags.Format<"uuid">>(),
    });
    typia.assert(output);
}