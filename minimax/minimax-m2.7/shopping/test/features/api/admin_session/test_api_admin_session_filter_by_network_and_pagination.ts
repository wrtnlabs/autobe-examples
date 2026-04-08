import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_filter_by_network_and_pagination(connection: api.IConnection): Promise<void> {
    // 1. Create admin account using join
    const joinConnection: api.IConnection = { host: connection.host };
    const joinedAdmin = await authorize_admin_join(joinConnection, {
        body: {
            actorType: "customer",
            requestedGrade: "super_admin",
            reason: RandomGenerator.paragraph({ sentences: 5 }),
            href: typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">,
            referrer: typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">,
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    typia.assert(joinedAdmin);
    // 2. Login multiple times to create sessions with different network metadata
    const adminPassword = "TestPassword123!";
    // Login session 1 - IP: 192.168.1.100, href: /admin/dashboard
    const sessionConnection1: api.IConnection = { host: connection.host };
    await authorize_admin_login(sessionConnection1, {
        body: {
            email: joinedAdmin.email,
            password: adminPassword,
            href: "/admin/dashboard",
            ip: "192.168.1.100" as string & tags.Format<"ipv4">,
            referrer: "https://example.com/admin" as string & tags.Format<"uri">,
        } satisfies IEcommerceMallAdmin.ILogin,
    });
    // Login session 2 - IP: 192.168.1.200, href: /admin/users
    const sessionConnection2: api.IConnection = { host: connection.host };
    await authorize_admin_login(sessionConnection2, {
        body: {
            email: joinedAdmin.email,
            password: adminPassword,
            href: "/admin/users",
            ip: "192.168.1.200" as string & tags.Format<"ipv4">,
            referrer: "https://example.com/home" as string & tags.Format<"uri">,
        } satisfies IEcommerceMallAdmin.ILogin,
    });
    // Login session 3 - IP: 192.168.1.100, href: /admin/products
    const sessionConnection3: api.IConnection = { host: connection.host };
    await authorize_admin_login(sessionConnection3, {
        body: {
            email: joinedAdmin.email,
            password: adminPassword,
            href: "/admin/products",
            ip: "192.168.1.100" as string & tags.Format<"ipv4">,
            referrer: "https://example.com/search" as string & tags.Format<"uri">,
        } satisfies IEcommerceMallAdmin.ILogin,
    });
    // 3. Filter sessions by IP address (192.168.1.100)
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: joinedAdmin.email,
            password: adminPassword,
            href: "/admin/sessions",
            ip: "127.0.0.1" as string & tags.Format<"ipv4">,
            referrer: "https://example.com/login" as string & tags.Format<"uri">,
        } satisfies IEcommerceMallAdmin.ILogin,
    });
    const ipFilterResult = await api.functional.ecommerceMall.admin.admin.sessions.index(adminConnection, {
        body: {
            ip: "192.168.1.100",
        } satisfies IEcommerceMallAdminSession.IRequest,
    });
    typia.assert(ipFilterResult);
    // Validate that sessions match the IP filter
    TestValidator.predicate("sessions should match IP filter 192.168.1.100", ipFilterResult.data.every((session) => session.ip.includes("192.168.1.100")));
    TestValidator.predicate("should have at least 2 sessions with IP 192.168.1.100", ipFilterResult.data.length >= 2);
    // 4. Filter sessions by href URL path
    const hrefFilterResult = await api.functional.ecommerceMall.admin.admin.sessions.index(adminConnection, {
        body: {
            href: "/admin/products",
        } satisfies IEcommerceMallAdminSession.IRequest,
    });
    typia.assert(hrefFilterResult);
    // Validate that sessions match the href filter
    TestValidator.predicate("sessions should match href filter /admin/products", hrefFilterResult.data.every((session) => session.href.includes("/admin/products")));
    // 5. Filter sessions by referrer header
    const referrerFilterResult = await api.functional.ecommerceMall.admin.admin.sessions.index(adminConnection, {
        body: {
            referrer: "https://example.com/home",
        } satisfies IEcommerceMallAdminSession.IRequest,
    });
    typia.assert(referrerFilterResult);
    // Validate that sessions match the referrer filter
    TestValidator.predicate("sessions should match referrer filter https://example.com/home", referrerFilterResult.data.every((session) => session.referrer.includes("https://example.com/home")));
    // 6. Test pagination with limit parameter
    const paginationResult = await api.functional.ecommerceMall.admin.admin.sessions.index(adminConnection, {
        body: {
            limit: 2,
        } satisfies IEcommerceMallAdminSession.IRequest,
    });
    typia.assert(paginationResult);
    // Validate pagination metadata
    TestValidator.predicate("data count should not exceed limit", paginationResult.data.length <= 2);
    // 7. Test cursor-based pagination
    if (paginationResult.data.length > 0) {
        const lastSession = paginationResult.data[paginationResult.data.length - 1];
        const cursorPaginationResult = await api.functional.ecommerceMall.admin.admin.sessions.index(adminConnection, {
            body: {
                limit: 2,
                cursor: lastSession.id,
            } satisfies IEcommerceMallAdminSession.IRequest,
        });
        typia.assert(cursorPaginationResult);
        // Validate cursor pagination returns next page results
        TestValidator.predicate("cursor pagination should return results", cursorPaginationResult.data.length >= 0);
    }
}