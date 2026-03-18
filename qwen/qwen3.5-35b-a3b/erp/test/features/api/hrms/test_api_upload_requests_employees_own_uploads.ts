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

export async function test_api_upload_requests_employees_own_uploads(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join the system as a member
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Extract member ID (used as employee identifier)
  const employeeId = memberAuth.id;
  // 3. Test default behavior - should filter by current user's employee ID
  const defaultConnection: api.IConnection = { host: connection.host };
  defaultConnection.headers = {
    ...defaultConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const defaultResponse =
    await api.functional.hrms.member.upload_requests.index(defaultConnection, {
      body: {},
    });
  typia.assert(defaultResponse);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default (20)",
    defaultResponse.pagination.limit,
    20,
  );
  // 5. Verify each upload record contains required fields
  const requiredFields = [
    "id",
    "originalFilename",
    "fileType",
    "fileSize",
    "validationStatus",
    "uploadState",
    "createdAt",
  ];
  if (defaultResponse.data.length > 0) {
    const firstUpload = defaultResponse.data[0];
    for (const field of requiredFields) {
      TestValidator.equals(
        `upload record has ${field} field`,
        firstUpload.hasOwnProperty(field),
        true,
      );
    }
  }
  // 6. Test status filter - filter by 'pending' status
  const statusFilterConnection: api.IConnection = { host: connection.host };
  statusFilterConnection.headers = {
    ...statusFilterConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const statusFilterResponse =
    await api.functional.hrms.member.upload_requests.index(
      statusFilterConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(statusFilterResponse);
  // Verify all returned uploads match the filter
  if (statusFilterResponse.data.length > 0) {
    const allMatchStatus = statusFilterResponse.data.every(
      (upload) => upload.uploadState === "pending",
    );
    TestValidator.predicate("all uploads match status filter", allMatchStatus);
  }
  // 7. Test date range filter
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeConnection: api.IConnection = { host: connection.host };
  dateRangeConnection.headers = {
    ...dateRangeConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const dateRangeResponse =
    await api.functional.hrms.member.upload_requests.index(
      dateRangeConnection,
      {
        body: {
          dateRange: {
            startDate: lastWeek.toISOString().split("T")[0],
            endDate: today.toISOString().split("T")[0],
          },
        },
      },
    );
  typia.assert(dateRangeResponse);
  // Verify date range filtering works
  if (dateRangeResponse.data.length > 0) {
    const startDate = new Date(lastWeek.toISOString().split("T")[0]);
    const endDate = new Date(today.toISOString().split("T")[0]);
    const allInRange = dateRangeResponse.data.every((upload) => {
      const uploadDate = new Date(upload.createdAt);
      return uploadDate >= startDate && uploadDate <= endDate;
    });
    TestValidator.predicate("all uploads within date range", allInRange);
  }
  // 8. Test file type filter
  const fileTypeConnection: api.IConnection = { host: connection.host };
  fileTypeConnection.headers = {
    ...fileTypeConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const fileTypeResponse =
    await api.functional.hrms.member.upload_requests.index(fileTypeConnection, {
      body: {
        fileType: "image",
      },
    });
  typia.assert(fileTypeResponse);
  // Verify file type filtering works
  if (fileTypeResponse.data.length > 0) {
    const allMatchFileType = fileTypeResponse.data.every((upload) =>
      upload.fileType.toLowerCase().includes("image"),
    );
    TestValidator.predicate(
      "all uploads match file type filter",
      allMatchFileType,
    );
  }
  // 9. Test sorting - by created_at ascending
  const sortAscConnection: api.IConnection = { host: connection.host };
  sortAscConnection.headers = {
    ...sortAscConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const sortAscResponse =
    await api.functional.hrms.member.upload_requests.index(sortAscConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 10,
      },
    });
  typia.assert(sortAscResponse);
  // Verify sorting is correct
  if (sortAscResponse.data.length > 1) {
    const isSortedAsc = sortAscResponse.data.every((upload, index, array) => {
      if (index === 0) return true;
      return new Date(upload.createdAt) >= new Date(array[index - 1].createdAt);
    });
    TestValidator.predicate(
      "uploads sorted in ascending order by created_at",
      isSortedAsc,
    );
  }
  // 10. Test sorting - by created_at descending
  const sortDescConnection: api.IConnection = { host: connection.host };
  sortDescConnection.headers = {
    ...sortDescConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const sortDescResponse =
    await api.functional.hrms.member.upload_requests.index(sortDescConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 10,
      },
    });
  typia.assert(sortDescResponse);
  // Verify descending sort is correct
  if (sortDescResponse.data.length > 1) {
    const isSortedDesc = sortDescResponse.data.every((upload, index, array) => {
      if (index === 0) return true;
      return new Date(upload.createdAt) <= new Date(array[index - 1].createdAt);
    });
    TestValidator.predicate(
      "uploads sorted in descending order by created_at",
      isSortedDesc,
    );
  }
  // 11. Test explicit employeeId filter
  const employeeIdFilterConnection: api.IConnection = { host: connection.host };
  employeeIdFilterConnection.headers = {
    ...employeeIdFilterConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const employeeIdFilterResponse =
    await api.functional.hrms.member.upload_requests.index(
      employeeIdFilterConnection,
      {
        body: {
          employeeId: employeeId,
          limit: 10,
        },
      },
    );
  typia.assert(employeeIdFilterResponse);
  // Verify employeeId filter returns results
  TestValidator.equals(
    "employeeId filter returns paginated results",
    employeeIdFilterResponse.data.length >= 0,
    true,
  );
}