import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { TestValidator } from "@nestia/e2e";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";

export async function test_api_health_check_filtered_paginated_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminAuth);
  // Update the connection headers with the token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Define various filter payloads to test filtering and pagination
  // Filter by status 'OK'
  const filterStatusOk = {
    status: "OK",
    page: 1,
    limit: 5,
  } as Partial<IDiscussionBoardHealthCheck.IRequest> & {
    status: "OK";
    page: number;
    limit: number;
  };
  // Filter by status 'ERROR'
  const filterStatusError = {
    status: "ERROR",
    page: 1,
    limit: 5,
  } as Partial<IDiscussionBoardHealthCheck.IRequest> & {
    status: "ERROR";
    page: number;
    limit: number;
  };
  // Filter by checkedAt date range
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterdayIso = new Date(now.getTime() - oneDayMs).toISOString();
  const twoDaysAgoIso = new Date(now.getTime() - 2 * oneDayMs).toISOString();
  const filterDateRange = {
    checkedAtFrom: twoDaysAgoIso,
    checkedAtTo: yesterdayIso,
    page: 1,
    limit: 5,
  } as Partial<IDiscussionBoardHealthCheck.IRequest> & {
    checkedAtFrom: string;
    checkedAtTo: string;
    page: number;
    limit: number;
  };
  // Filter by details text contains substring
  const filterDetailsContains = {
    detailsContains: "error",
    page: 1,
    limit: 5,
  } as Partial<IDiscussionBoardHealthCheck.IRequest> & {
    detailsContains: string;
    page: number;
    limit: number;
  };
  // Pagination test: page 2 with limit 3
  const paginationTest = {
    page: 2,
    limit: 3,
  } as Partial<IDiscussionBoardHealthCheck.IRequest> & {
    page: number;
    limit: number;
  };

  // Helper function to validate returned page structure
  async function assertHealthCheckPage(
    body: Partial<IDiscussionBoardHealthCheck.IRequest>,
  ) {
    const response = await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      superAdminConnection,
      { body: body as IDiscussionBoardHealthCheck.IRequest },
    );
    typia.assert(response);
    typia.assert(response.pagination);
    typia.assert(Array.isArray(response.data));
    for (const item of response.data) {
      typia.assert(item);
    }
    return response;
  }

  // Call endpoint with different filters
  await assertHealthCheckPage(filterStatusOk);
  await assertHealthCheckPage(filterStatusError);
  await assertHealthCheckPage(filterDateRange);
  await assertHealthCheckPage(filterDetailsContains);
  await assertHealthCheckPage(paginationTest);

  // Test unauthorized access (no auth header) must fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
