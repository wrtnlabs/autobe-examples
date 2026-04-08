import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
export async function test_api_administrator_approval_requests_filter_status_date_range(connection: api.IConnection): Promise<void> {
    // 1. Register super administrator
    const superAdminJoinConnection: api.IConnection = { host: connection.host };
    const superAdminJoinAuth = await authorize_super_administrator_join(superAdminJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            display_name: RandomGenerator.name(2),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
        } satisfies IEcommerceMallSuperAdministrator.IJoin,
    });
    typia.assert(superAdminJoinAuth);
    // Store super admin credentials for login
    const superAdminEmail = superAdminJoinAuth.superAdministrator.email;
    const superAdminPassword = superAdminJoinAuth.token.access.split(" ")[1];
    // 2. Register member accounts (customers)
    const memberData: {
        email: string;
        password: string;
        id: string;
    }[] = [];
    for (let i = 0; i < 5; i++) {
        const memberJoinConnection: api.IConnection = { host: connection.host };
        const memberJoinAuth = await authorize_member_join(memberJoinConnection, {
            body: {
                email: typia.random<string & tags.Format<"email">>(),
                password: RandomGenerator.alphaNumeric(16),
                display_name: RandomGenerator.name(),
                phone_number: RandomGenerator.mobile(),
                href: typia.random<string & tags.Format<"uri">>(),
                referrer: typia.random<string & tags.Format<"uri">>(),
                ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
            } satisfies IEcommerceMallMember.IJoin,
        });
        typia.assert(memberJoinAuth);
        memberData.push({
            email: memberJoinAuth.email,
            password: RandomGenerator.alphaNumeric(16), // We'll use this for login
            id: memberJoinAuth.id,
        });
    }
    // 3. Login members and create approval requests with varied timestamps
    const requestCreatedDates: Date[] = [];
    const requestIds: string[] = [];
    // Create 2 pending requests with different timestamps
    for (let i = 0; i < 2; i++) {
        const member = memberData[i];
        const memberLoginConnection: api.IConnection = { host: connection.host };
        await authorize_member_login(memberLoginConnection, {
            body: {
                email: member.email,
                password: member.password,
                href: typia.random<string & tags.Format<"uri">>(),
                referrer: typia.random<string & tags.Format<"uri">>(),
            } satisfies IEcommerceMallMember.ILogin,
        });
        // Create approval request using member's connection
        const requestConnection: api.IConnection = { host: connection.host };
        const approvalRequest = await api.functional.ecommerceMall.member.administrator_approval_requests.create(requestConnection, {
            body: {
                requestingMemberId: member.id,
                reason: `Reason for admin request #${i + 1}`,
            } as IEcommerceMallAdministratorApprovalRequests.ICreate,
        });
        typia.assert(approvalRequest);
        requestIds.push(approvalRequest.id);
        requestCreatedDates.push(new Date(approvalRequest.created_at));
    }
    // Wait to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 100));
    // 4. Login as super administrator for listing
    const superAdminLoginConnection: api.IConnection = { host: connection.host };
    await authorize_super_administrator_login(superAdminLoginConnection, {
        body: {
            email: superAdminEmail,
            password: superAdminPassword,
        } satisfies IEcommerceMallSuperAdministrator.ILogin,
    });
    // 5. Test filter by status='pending'
    const pendingFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        status: "pending",
        limit: 100,
    };
    const pendingResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: pendingFilter });
    typia.assert(pendingResult);
    TestValidator.equals("pending filter returns only pending requests", pendingResult.data.every((r) => r.status === "pending"), true);
    TestValidator.equals("pending count matches pagination records", pendingResult.data.length, pendingResult.pagination.records);
    // 6. Test filter by status='approved'
    const approvedFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        status: "approved",
        limit: 100,
    };
    const approvedResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: approvedFilter });
    typia.assert(approvedResult);
    TestValidator.equals("approved filter returns only approved requests", approvedResult.data.every((r) => r.status === "approved"), true);
    // 7. Test filter by status='rejected'
    const rejectedFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        status: "rejected",
        limit: 100,
    };
    const rejectedResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: rejectedFilter });
    typia.assert(rejectedResult);
    TestValidator.equals("rejected filter returns only rejected requests", rejectedResult.data.every((r) => r.status === "rejected"), true);
    // 8. Test date range filter
    const fromDate = requestCreatedDates[0];
    const toDate = requestCreatedDates[requestCreatedDates.length - 1];
    const dateRangeFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        limit: 100,
    };
    const dateRangeResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: dateRangeFilter });
    typia.assert(dateRangeResult);
    TestValidator.equals("date range filter returns requests within range", dateRangeResult.pagination.records, requestCreatedDates.length);
    // Verify all returned items are within date range
    TestValidator.predicate("all dates within range", dateRangeResult.data.every((r) => r.created_at >= fromDate.toISOString() && r.created_at <= toDate.toISOString()));
    // 9. Test composite filter: status + date range
    const compositeFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        status: "pending",
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        limit: 100,
    };
    const compositeResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: compositeFilter });
    typia.assert(compositeResult);
    TestValidator.equals("composite filter returns pending requests in date range", compositeResult.data.every((r) => r.status === "pending"), true);
    TestValidator.predicate("composite filter dates within range", compositeResult.data.every((r) => r.created_at >= fromDate.toISOString() && r.created_at <= toDate.toISOString()));
    // 10. Verify sorting (newest first)
    const allResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: {} });
    typia.assert(allResult);
    if (allResult.data.length >= 2) {
        const firstDate = new Date(allResult.data[0].created_at);
        const secondDate = new Date(allResult.data[1].created_at);
        TestValidator.predicate("results sorted newest first (default)", firstDate >= secondDate);
    }
    // 11. Test oldest first sorting
    const oldestFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        sortOrder: "oldest_first",
        limit: 100,
    };
    const oldestResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: oldestFilter });
    typia.assert(oldestResult);
    if (oldestResult.data.length >= 2) {
        const firstDate = new Date(oldestResult.data[0].created_at);
        const secondDate = new Date(oldestResult.data[1].created_at);
        TestValidator.predicate("results sorted oldest first", firstDate <= secondDate);
    }
    // 12. Test pagination with page parameter
    const pageFilter: IEcommerceMallAdministratorApprovalRequests.IRequest = {
        page: 1,
        limit: 1,
    };
    const pageResult = await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.index(superAdminLoginConnection, { body: pageFilter });
    typia.assert(pageResult);
    TestValidator.equals("page 1 has max 1 record", pageResult.pagination.records, pageResult.data.length);
    TestValidator.equals("current page is 1", pageResult.pagination.current, 1);
    TestValidator.equals("limit respected", pageResult.pagination.limit, 1);
}