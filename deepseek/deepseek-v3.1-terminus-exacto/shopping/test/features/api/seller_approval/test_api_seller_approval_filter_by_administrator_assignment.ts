import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_approval_filter_by_administrator_assignment(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as super administrator
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_administrator_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSuperAdministrator.IJoin,
    });
    typia.assert(superAdmin);

    // 2. Test filtering with null administrator_id (unassigned requests)
    const nullFilterResults = await api.functional.ecommerce.superAdministrator.seller_approvals.index(superAdminConnection, {
        body: {
            administrator_id: null,
            page: 1,
            limit: 100,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
    });
    typia.assert(nullFilterResults);

    // Validate that all returned items have null administrator or undefined
    for (const item of nullFilterResults.data) {
        TestValidator.predicate("null administrator filter returns only null/undefined assignments", item.administrator === null || item.administrator === undefined);
    }

    // 3. Test filtering with random UUID administrator_id
    const randomAdminId = typia.random<string & tags.Format<"uuid">>();
    const randomFilterResults = await api.functional.ecommerce.superAdministrator.seller_approvals.index(superAdminConnection, {
        body: {
            administrator_id: randomAdminId,
            page: 1,
            limit: 100,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
    });
    typia.assert(randomFilterResults);

    // Validate that all returned items have matching administrator_id or null
    for (const item of randomFilterResults.data) {
        if (item.administrator) {
            TestValidator.equals("administrator_id filter matches assigned administrator", item.administrator.id, randomAdminId);
        }
    }

    // 4. Test pagination properties
    TestValidator.predicate("pagination current page is valid", randomFilterResults.pagination.current >= 0);
    TestValidator.predicate("pagination limit is valid", randomFilterResults.pagination.limit > 0);
    TestValidator.predicate("pagination records count is non-negative", randomFilterResults.pagination.records >= 0);
    TestValidator.predicate("pagination pages count is non-negative", randomFilterResults.pagination.pages >= 0);

    // 5. Validate seller summary structure in each item
    for (const item of randomFilterResults.data) {
        typia.assert(item.seller);
        TestValidator.predicate("seller has valid email format", /^[^\s]+@[^\s]+$/.test(item.seller.email));
        TestValidator.predicate("seller shop name is not empty", item.seller.shop_name.length > 0);
        TestValidator.predicate("seller creation date is valid ISO format", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.seller.created_at));
    }
}