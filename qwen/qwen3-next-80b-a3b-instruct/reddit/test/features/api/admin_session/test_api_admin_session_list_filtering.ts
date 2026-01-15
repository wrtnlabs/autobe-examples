import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminSession";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_list_filtering(connection: api.IConnection): Promise<void> {
    // Create admin connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<'email'>>(),
            href: 'https://example.com/join',
            referrer: 'https://example.com',
            ip: null
        } satisfies ICommunityPlatformAdmin.IJoin
    });
    // Test 1: Basic filtering with page and limit
    const response1 = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 10
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(response1);
    TestValidator.equals('pagination has correct current page', response1.pagination.current, 1);
    TestValidator.equals('pagination has correct limit', response1.pagination.limit, 10);
    TestValidator.predicate('data array exists', Array.isArray(response1.data));
    // Test 2: Active session filter
    const response2 = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
            isActive: true
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(response2);
    response2.data.forEach(session => {
        TestValidator.equals('session has valid status', session.authStatus, 'active');
    });
    // Test 3: Expired session filter
    const response3 = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
            isActive: false
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(response3);
    response3.data.forEach(session => {
        TestValidator.equals('session has valid status', session.authStatus, 'expired');
    });
    // Test 4: Sort by authTime ascending
    const response4 = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 5,
            sortBy: 'authTime',
            sortOrder: 'asc'
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(response4);
    // Test 5: Sort by expireTime descending
    const response5 = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 5,
            sortBy: 'expireTime',
            sortOrder: 'desc'
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(response5);
    // Test 6: Sort by duration
    const response6 = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 5,
            sortBy: 'duration',
            sortOrder: 'asc'
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(response6);
    // Test 7: Verify all sessions in data have valid structure
    const sampleResponse = await api.functional.communityPlatform.admin.admin.sessions.index(adminConnection, {
        body: {
            page: 1,
            limit: 1
        } satisfies ICommunityPlatformAdminSession.IRequest
    });
    typia.assert(sampleResponse);
    if (sampleResponse.data.length > 0) {
        const session = sampleResponse.data[0];
        TestValidator.equals('session has string id', typeof session.id, 'string');
        TestValidator.equals('session has valid uuid', session.id, session.id);
    }
}