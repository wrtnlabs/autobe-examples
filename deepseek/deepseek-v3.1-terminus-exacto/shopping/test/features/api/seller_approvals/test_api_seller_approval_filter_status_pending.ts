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

export async function test_api_seller_approval_filter_status_pending(connection: api.IConnection): Promise<void> {
    // Authenticate as super administrator
    const superAdminConnection: api.IConnection = { host: connection.host };
    
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);
    const href = typia.random<string & tags.Format<"uri">>();
    const referrer = typia.random<string & tags.Format<"uri">>();
    const ip = typia.random<string & tags.Format<"ipv4">>();
    
    await api.functional.ecommerce.auth.superAdministrator.join(superAdminConnection, {
        body: {
            email: email,
            password: password,
            href: href,
            referrer: referrer,
            ip: ip
        } satisfies IEcommerceSuperAdministrator.IJoin,
    });

    // Search for pending seller approval requests
    const searchResult = await api.functional.ecommerce.superAdministrator.seller_approvals.index(superAdminConnection, {
        body: {
            status: "pending",
            page: 1,
            limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
    });
    
    typia.assert(searchResult);
    
    // Validate pagination metadata
    TestValidator.equals("pagination current page", searchResult.pagination.current, 1);
    TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
    TestValidator.predicate("records count is non-negative", searchResult.pagination.records >= 0);
    TestValidator.predicate("pages count is non-negative", searchResult.pagination.pages >= 0);
    
    // Validate each returned entry has correct status
    for (const entry of searchResult.data) {
        TestValidator.equals("entry status should be pending", entry.status, "pending");
        
        // Validate seller information is properly included
        TestValidator.predicate("seller ID should be UUID", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.seller.id));
        TestValidator.predicate("seller email should be valid", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.seller.email));
        TestValidator.predicate("seller shop name should not be empty", entry.seller.shop_name.length > 0);
        TestValidator.predicate("seller created at should be ISO date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.seller.created_at));
    }
}