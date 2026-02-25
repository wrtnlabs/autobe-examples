import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_performance_comprehensive_metrics_retrieval(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    await authorize_super_administrator_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSuperAdministrator.IJoin,
    });
    // Retrieve seller performance metrics without filters to get all sellers
    const performance = await api.functional.ecommerce.superAdministrator.seller_performance.index(superAdminConnection, {
        body: {} satisfies IEcommerceSeller.IRequest,
    });
    typia.assert(performance);
    // Validate pagination structure
    TestValidator.equals("pagination structure", typeof performance.pagination, "object");
    TestValidator.predicate("has current page", performance.pagination.current >= 0);
    TestValidator.predicate("has limit", performance.pagination.limit >= 0);
    TestValidator.predicate("has records count", performance.pagination.records >= 0);
    TestValidator.predicate("has pages count", performance.pagination.pages >= 0);
    // Validate seller data structure
    TestValidator.equals("data array type", Array.isArray(performance.data), true);
    // Test each seller summary structure
    for (const seller of performance.data) {
        typia.assert(seller);
        TestValidator.predicate("has valid seller id", typeof seller.id === "string");
        TestValidator.predicate("has valid email", typeof seller.email === "string");
        TestValidator.predicate("has shop name", typeof seller.shop_name === "string");
        TestValidator.predicate("has account status", typeof seller.account_status === "string");
        TestValidator.predicate("has creation date", typeof seller.created_at === "string");
    }
    // Test comprehensive metrics retrieval by including search criteria
    const emptyRequest = await api.functional.ecommerce.superAdministrator.seller_performance.index(superAdminConnection, {
        body: {
            search: "",
            account_status: undefined,
            created_after: undefined,
            created_before: undefined,
            page: 1,
            limit: 10,
        } satisfies IEcommerceSeller.IRequest,
    });
    typia.assert(emptyRequest);
    TestValidator.equals("page request structure", typeof emptyRequest.pagination, "object");
    // Test with specific pagination
    const paginatedRequest = await api.functional.ecommerce.superAdministrator.seller_performance.index(superAdminConnection, {
        body: {
            page: 1,
            limit: 5,
        } satisfies IEcommerceSeller.IRequest,
    });
    typia.assert(paginatedRequest);
    TestValidator.predicate("limit respected", paginatedRequest.pagination.limit <= 5);
    // Validate that the API returns consistent data structure
    TestValidator.equals("consistent response type", typeof performance, "object");
    TestValidator.predicate("has pagination and data", performance.pagination !== undefined && performance.data !== undefined);
}

// Utility function for super administrator authentication
async function authorize_super_administrator_join(connection: api.IConnection, props: {
    body: IEcommerceSuperAdministrator.IJoin;
}): Promise<IEcommerceSuperAdministrator.IAuthorized> {
    const joinInput = {
        email: props.body.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin;
    return await api.functional.ecommerce.auth.superAdministrator.join(connection, { body: joinInput });
}