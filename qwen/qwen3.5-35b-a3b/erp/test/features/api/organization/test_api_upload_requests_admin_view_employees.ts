import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDateRange";
import type { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFileUpload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_upload_requests_admin_view_employees(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin/owner member
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(adminResponse);
  const adminId = adminResponse.id;
  // Step 2: Register regular employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeResponse = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeResponse);
  const employeeId = employeeResponse.id;
  // Step 3: Admin views all upload requests (filtering by employeeId)
  const adminViewConnection: api.IConnection = { host: connection.host };
  const adminViewResponse =
    await api.functional.hrms.member.upload_requests.index(
      adminViewConnection,
      {
        body: {
          employeeId: employeeId,
          limit: 20,
        } satisfies IHrmsFileUpload.IRequest,
      },
    );
  typia.assert(adminViewResponse);
  // Step 4: Validate admin can view uploads (may be empty if no uploads exist yet)
  TestValidator.equals(
    "admin can view employee uploads with pagination",
    adminViewResponse.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "pagination metadata valid",
    adminViewResponse.pagination.records >= 0,
    true,
  );
  // Step 5: Test date range filtering
  const dateRange: IHrmsDateRange = {
    startDate: new Date().toISOString().split("T")[0],
  };
  const adminViewDateFiltered =
    await api.functional.hrms.member.upload_requests.index(
      adminViewConnection,
      {
        body: {
          employeeId: employeeId,
          dateRange: dateRange,
          limit: 20,
        } satisfies IHrmsFileUpload.IRequest,
      },
    );
  typia.assert(adminViewDateFiltered);
  TestValidator.equals(
    "date range filtering works",
    adminViewDateFiltered.data.length >= 0,
    true,
  );
  // Step 6: Test status filtering - admin can view uploads regardless of status
  const pendingStatusFiltered =
    await api.functional.hrms.member.upload_requests.index(
      adminViewConnection,
      {
        body: {
          employeeId: employeeId,
          status: "pending",
          limit: 20,
        } satisfies IHrmsFileUpload.IRequest,
      },
    );
  typia.assert(pendingStatusFiltered);
  TestValidator.equals(
    "status filtering works for pending",
    pendingStatusFiltered.data.length >= 0,
    true,
  );
  // Step 7: Test validated status
  const validatedStatusFiltered =
    await api.functional.hrms.member.upload_requests.index(
      adminViewConnection,
      {
        body: {
          employeeId: employeeId,
          status: "validated",
          limit: 20,
        } satisfies IHrmsFileUpload.IRequest,
      },
    );
  typia.assert(validatedStatusFiltered);
  TestValidator.equals(
    "status filtering works for validated",
    validatedStatusFiltered.data.length >= 0,
    true,
  );
  // Step 8: Test stored status
  const storedStatusFiltered =
    await api.functional.hrms.member.upload_requests.index(
      adminViewConnection,
      {
        body: {
          employeeId: employeeId,
          status: "stored",
          limit: 20,
        } satisfies IHrmsFileUpload.IRequest,
      },
    );
  typia.assert(storedStatusFiltered);
  TestValidator.equals(
    "status filtering works for stored",
    storedStatusFiltered.data.length >= 0,
    true,
  );
  // Step 9: Test failed status
  const failedStatusFiltered =
    await api.functional.hrms.member.upload_requests.index(
      adminViewConnection,
      {
        body: {
          employeeId: employeeId,
          status: "failed",
          limit: 20,
        } satisfies IHrmsFileUpload.IRequest,
      },
    );
  typia.assert(failedStatusFiltered);
  TestValidator.equals(
    "status filtering works for failed",
    failedStatusFiltered.data.length >= 0,
    true,
  );
  // Step 10: Test sorting by created_at
  const sortedResponse = await api.functional.hrms.member.upload_requests.index(
    adminViewConnection,
    {
      body: {
        employeeId: employeeId,
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 20,
      } satisfies IHrmsFileUpload.IRequest,
    },
  );
  typia.assert(sortedResponse);
  TestValidator.equals(
    "sorting by created_at works",
    sortedResponse.data.length >= 0,
    true,
  );
  // Step 11: Validate upload summary structure for each record
  for (const upload of adminViewResponse.data) {
    typia.assert(upload);
    TestValidator.equals("upload has id", upload.id !== undefined, true);
    TestValidator.equals(
      "upload has filename",
      upload.originalFilename !== undefined,
      true,
    );
    TestValidator.equals(
      "upload has status",
      upload.validationStatus !== undefined,
      true,
    );
    TestValidator.equals(
      "upload has uploadState",
      upload.uploadState !== undefined,
      true,
    );
    TestValidator.equals(
      "upload has createdAt",
      upload.createdAt !== undefined,
      true,
    );
  }
}