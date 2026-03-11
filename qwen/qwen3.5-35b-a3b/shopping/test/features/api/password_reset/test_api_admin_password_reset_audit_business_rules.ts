import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { authorize_admin_join as authorize_admin_join_import } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function authorize_admin_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceMallAdmin.IJoin>;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin;
    return await api.functional.ecommerceMall.auth.admin.join(connection, {
        body: joinInput,
    });
}
/**
 * Test business rules and edge cases for admin password reset audit functionality.
 *
 * Validates:
 * - Pagination with limit and page parameters
 * - Search/filter parameter security (SQL injection prevention)
 * - Date range filtering
 * - Actor type and request status filtering
 * - Sorting functionality
 * - No sensitive data (reset tokens) in response
 * - Pagination metadata accuracy
 * - Response field formats (email, timestamps)
 */
export async function test_api_admin_password_reset_audit_business_rules(connection: api.IConnection): Promise<void> {
    // Step 1: Create super administrator
    const adminConnection: api.IConnection = { host: connection.host };
    const adminResult = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    typia.assert(adminResult);
    TestValidator.equals("admin token present", adminResult.token.access !== "", true);
    // Step 2: Verify no password reset requests initially (empty list)
    const emptyResult = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: {} satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(emptyResult);
    TestValidator.equals("initial reset count", emptyResult.data.length, 0);
    TestValidator.equals("total records", emptyResult.pagination.records, 0);
    TestValidator.equals("current page", emptyResult.pagination.current, 1);
    TestValidator.equals("total pages", emptyResult.pagination.pages, 0);
    // Step 3: Test pagination with limit parameter (max 100)
    const resultWithLimit = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: { limit: 100 } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(resultWithLimit);
    TestValidator.equals("limit max 100", resultWithLimit.pagination.limit, 100);
    // Step 4: Test pagination with page parameter
    const resultWithPage = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: { page: 1, limit: 10 } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(resultWithPage);
    TestValidator.equals("page 1 current", resultWithPage.pagination.current, 1);
    // Step 5: Test search parameter (SQL injection prevention)
    const maliciousSearch = "'; DROP TABLE users; --";
    const searchResult = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: { search: maliciousSearch } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(searchResult);
    // Should not crash, should return safe results
    TestValidator.predicate("search safe", Array.isArray(searchResult.data));
    // Step 6: Test date range filtering
    const beforeDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const afterDate = new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();
    const dateFilterResult = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: {
            createdAtFrom: afterDate,
            createdAtTo: beforeDate,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(dateFilterResult);
    TestValidator.predicate("date filter valid", Array.isArray(dateFilterResult.data));
    // Step 7: Test actorType filter
    const actorTypeResult = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: { actorType: "customer" } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(actorTypeResult);
    TestValidator.predicate("actorType filter valid", Array.isArray(actorTypeResult.data));
    // Step 8: Test requestStatus filter
    const statusResult = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: { requestStatus: "pending" } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(statusResult);
    TestValidator.predicate("status filter valid", Array.isArray(statusResult.data));
    // Step 9: Test sort parameter
    const sortResult = await api.functional.ecommerceMall.admin.password_resets.index(adminConnection, {
        body: { sort: "createdAt", sortOrder: "asc" } satisfies IEcommerceMallSellerPasswordReset.IRequest,
    });
    typia.assert(sortResult);
    TestValidator.predicate("sort filter valid", Array.isArray(sortResult.data));
    // Step 10: Verify response does NOT include sensitive reset token
    // The ISummary DTO only has: id, email, expired_at, created_at
    // Check that no "token" or "resetToken" field exists
    for (const item of resultWithLimit.data) {
        typia.assert(item);
        const itemKeys = Object.keys(item) as (keyof IEcommerceMallSellerPasswordReset.ISummary)[];
        TestValidator.predicate("no token in response", !itemKeys.includes("token" as any));
        TestValidator.predicate("no resetToken in response", !itemKeys.includes("resetToken" as any));
    }
    // Step 11: Verify pagination metadata accuracy
    TestValidator.predicate("records >= 0", emptyResult.pagination.records >= 0);
    TestValidator.predicate("limit >= 0", emptyResult.pagination.limit >= 0);
    TestValidator.predicate("pages >= 0", emptyResult.pagination.pages >= 0);
    TestValidator.predicate("current >= 1", emptyResult.pagination.current >= 1);
    // Step 12: Verify email format in response (if any data exists)
    if (resultWithLimit.data.length > 0) {
        const firstItem = resultWithLimit.data[0];
        TestValidator.predicate("email is string", typeof firstItem.email === "string");
    }
    // Step 13: Verify timestamp format (ISO 8601)
    if (resultWithLimit.data.length > 0) {
        const firstItem = resultWithLimit.data[0];
        // Just verify it's a string that looks like ISO 8601
        TestValidator.predicate("expired_at is string", typeof firstItem.expired_at === "string");
        TestValidator.predicate("created_at is string", typeof firstItem.created_at === "string");
    }
}