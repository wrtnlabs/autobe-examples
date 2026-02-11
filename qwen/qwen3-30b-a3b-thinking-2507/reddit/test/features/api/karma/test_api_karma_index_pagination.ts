import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarma";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_karma_index_pagination(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>() satisfies string as string,
            password: "1234",
            username: RandomGenerator.name(),
        }
    });
    // 2. Test pagination with page=2, limit=10
    const response = await api.functional.community.admin.karmas.index(adminConnection, {
        body: {
            page: 2,
            limit: 10,
        }
    });
    typia.assert(response);
    // 3. Validate pagination metadata
    TestValidator.equals("current page", response.pagination.current, 2);
    TestValidator.equals("limit", response.pagination.limit, 10);
    TestValidator.predicate("records count should be at least 0", response.pagination.records >= 0);
    TestValidator.predicate("pages count should be at least 1", response.pagination.pages >= 1);
    // 4. Edge case: page beyond available records
    const edgeResponse = await api.functional.community.admin.karmas.index(adminConnection, {
        body: {
            page: 999,
            limit: 10,
        }
    });
    typia.assert(edgeResponse);
    // 5. Validate edge case response
    TestValidator.equals("edge case current page", edgeResponse.pagination.current, 999);
    TestValidator.equals("edge case records", edgeResponse.pagination.records, 0);
    TestValidator.equals("edge case pages", edgeResponse.pagination.pages, 1);
    TestValidator.equals("edge case data length", edgeResponse.data.length, 0);
}