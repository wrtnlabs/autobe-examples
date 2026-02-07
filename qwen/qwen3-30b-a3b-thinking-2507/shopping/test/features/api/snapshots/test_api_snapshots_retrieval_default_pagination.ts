import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSnapshot";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_snapshots_retrieval_default_pagination(connection: api.IConnection): Promise<void> {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.MinLength<8>>(),
        },
    });
    const response = await api.functional.ecommerce.admin.snapshots.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
        }
    });
    typia.assert(response);
    TestValidator.predicate("Response has data", response.data.length > 0);
    const snapshot = response.data[0];
    TestValidator.equals("Snapshot ID format", snapshot.id.length, 36);
    TestValidator.equals("Snapshot entity_type", snapshot.entity_type, "ecommerce_products");
    const sortedByCreatedAt = response.data.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    TestValidator.predicate("Snapshot sorted by created_at", response.data.every((item, index) => item.id === sortedByCreatedAt[index].id));
}