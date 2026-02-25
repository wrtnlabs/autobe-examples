import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorPromotion";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_search_pagination(connection: api.IConnection): Promise<void> {
    // Step 1: Authenticate as administrator
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceAdministrator.IJoin,
    });
    typia.assert(admin);
    
    // Step 2: Test pagination - first page
    const page1Response = await api.functional.ecommerce.administrator.administrator_promotions.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
        } satisfies IEcommerceAdministratorPromotion.IRequest,
    });
    typia.assert(page1Response);
    
    // Validate pagination metadata for first page
    TestValidator.equals("page1 pagination current", page1Response.pagination.current, 1);
    TestValidator.equals("page1 pagination limit", page1Response.pagination.limit, 10);
    TestValidator.predicate("page1 pagination records positive", page1Response.pagination.records >= 0);
    TestValidator.predicate("page1 pagination pages consistent", page1Response.pagination.pages >= 0);
    
    // Step 3: Test pagination - second page (only if there are enough records)
    if (page1Response.pagination.pages >= 2) {
        const page2Response = await api.functional.ecommerce.administrator.administrator_promotions.index(adminConnection, {
            body: {
                page: 2,
                limit: 10,
            } satisfies IEcommerceAdministratorPromotion.IRequest,
        });
        typia.assert(page2Response);
        
        // Validate pagination metadata for second page
        TestValidator.equals("page2 pagination current", page2Response.pagination.current, 2);
        TestValidator.equals("page2 pagination limit", page2Response.pagination.limit, 10);
        TestValidator.equals("page2 pagination records", page2Response.pagination.records, page1Response.pagination.records);
        TestValidator.equals("page2 pagination pages", page2Response.pagination.pages, page1Response.pagination.pages);
        
        // Verify no overlap between pages
        const page1Ids = new Set(page1Response.data.map(item => item.id));
        const page2Ids = new Set(page2Response.data.map(item => item.id));
        for (const id of page2Ids) {
            TestValidator.predicate("page2 ID not in page1", !page1Ids.has(id));
        }
        
        // Verify total records consistency
        TestValidator.predicate("total records consistent", page1Response.data.length + page2Response.data.length <= page1Response.pagination.records);
    }
}