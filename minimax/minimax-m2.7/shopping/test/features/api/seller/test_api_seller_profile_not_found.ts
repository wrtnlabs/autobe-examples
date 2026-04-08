import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_profile_not_found(connection: api.IConnection): Promise<void> {
    // 1. Create admin connection for authentication
    const adminConnection: api.IConnection = { host: connection.host };
    // 2. Submit admin request and authenticate
    await authorize_admin_join(adminConnection, {
        body: {
            actorType: "customer",
            requestedGrade: "admin",
            reason: "Test admin account for seller profile not found test",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    // 3. Generate a random UUID that does not exist
    const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
    // 4. Validate 404 error when requesting non-existent seller
    await TestValidator.httpError("non-existent seller returns 404", 404, async () => await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
        sellerId: nonExistentSellerId,
    }));
}