import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_files_list_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authOutput);
  // Create member-specific connection with token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authOutput.token.access}`,
    },
  };
  // 2. Test empty results with no filters (initial state)
  const emptyResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "initial list should be empty",
    emptyResult.data.length,
    0,
  );
  // 3. Test category filter with all possible values
  const categories = ["organization_logo", "user_avatar", "document"] as const;
  for (const category of categories) {
    const categoryResult = await api.functional.hrms.member.files.index(
      memberAuthConnection,
      {
        body: {
          category,
          validationStatus: undefined,
          ownerType: null,
          ownerId: null,
          filename: undefined,
          startDate: undefined,
          endDate: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          page: 1,
          limit: 10,
        } satisfies IHrmsFile.IRequest,
      },
    );
    typia.assert(categoryResult);
    TestValidator.equals(
      `category ${category} filtering works`,
      categoryResult.data.every(
        (file) =>
          file.file_category === category || file.file_category === null,
      ),
      true,
    );
  }
  // 4. Test validation status filter with all possible values
  const validationStatuses = ["pending", "validated", "rejected"] as const;
  for (const status of validationStatuses) {
    const statusResult = await api.functional.hrms.member.files.index(
      memberAuthConnection,
      {
        body: {
          category: undefined,
          validationStatus: status,
          ownerType: null,
          ownerId: null,
          filename: undefined,
          startDate: undefined,
          endDate: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          page: 1,
          limit: 10,
        } satisfies IHrmsFile.IRequest,
      },
    );
    typia.assert(statusResult);
    TestValidator.equals(
      `validation status ${status} filtering works`,
      statusResult.data.every(
        (file) =>
          file.validation_status === status || file.validation_status === null,
      ),
      true,
    );
  }
  // 5. Test owner type filter
  const ownerTypes: ("member" | "organization" | null)[] = [
    "member",
    "organization",
    null,
  ];
  for (const ownerType of ownerTypes) {
    const ownerTypeResult = await api.functional.hrms.member.files.index(
      memberAuthConnection,
      {
        body: {
          category: undefined,
          validationStatus: undefined,
          ownerType,
          ownerId: null,
          filename: undefined,
          startDate: undefined,
          endDate: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          page: 1,
          limit: 10,
        } satisfies IHrmsFile.IRequest,
      },
    );
    typia.assert(ownerTypeResult);
    TestValidator.equals(
      `owner type ${ownerType ?? "null"} filtering works`,
      ownerTypeResult.data.every((file) => {
        if (ownerType === "member")
          return file.owner !== null && file.owner !== undefined;
        if (ownerType === "organization")
          return file.owner === null || file.owner === undefined;
        return true;
      }),
      true,
    );
  }
  // 6. Test filename search with partial match
  const searchFilename = RandomGenerator.name(3);
  const filenameResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: searchFilename,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(filenameResult);
  TestValidator.equals(
    "filename search returns empty when no matches",
    filenameResult.data.length,
    0,
  );
  // 7. Test date range filtering
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date(
    now.getTime() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate,
        endDate,
        sortBy: undefined,
        sortOrder: undefined,
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  if (dateRangeResult.data.length > 0) {
    dateRangeResult.data.forEach((file) => {
      TestValidator.predicate(
        `file ${file.id} created within date range`,
        () => {
          const fileDate = new Date(file.created_at);
          return (
            fileDate >= new Date(startDate) && fileDate <= new Date(endDate)
          );
        },
      );
    });
  }
  // 8. Test sorting by filename (asc)
  const filenameAscResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: "filename",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(filenameAscResult);
  // 9. Test sorting by filename (desc)
  const filenameDescResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: "filename",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(filenameDescResult);
  // 10. Test sorting by file_size (desc)
  const fileSizeDescResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: "file_size",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(fileSizeDescResult);
  // 11. Test sorting by created_at (desc)
  const createdAtDescResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(createdAtDescResult);
  // 12. Test sorting by validation_status
  const validationStatusResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: "validation_status",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(validationStatusResult);
  // 13. Test pagination with different page numbers
  const page2Result = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        page: 2,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination metadata current page should be 2",
    page2Result.pagination.current,
    2,
  );
  // 14. Test pagination with different limit
  const limit5Result = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: undefined,
        validationStatus: undefined,
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        page: 1,
        limit: 5,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(limit5Result);
  TestValidator.equals(
    "pagination limit should be 5",
    limit5Result.pagination.limit,
    5,
  );
  // 15. Test pagination metadata accuracy
  TestValidator.equals(
    "pagination records should match data length when no filters",
    emptyResult.pagination.records,
    emptyResult.data.length,
  );
  // 16. Test combined filters
  const combinedResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: "document",
        validationStatus: "validated",
        ownerType: null,
        ownerId: null,
        filename: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(combinedResult);
  // 17. Test empty result with strict filters
  const strictFilterResult = await api.functional.hrms.member.files.index(
    memberAuthConnection,
    {
      body: {
        category: "organization_logo",
        validationStatus: "rejected",
        ownerType: "member",
        ownerId: null,
        filename: "nonexistent_file_xyz",
        startDate: undefined,
        endDate: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        page: 1,
        limit: 10,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(strictFilterResult);
  TestValidator.equals(
    "strict filters should return empty results",
    strictFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "strict filters should report 0 total records",
    strictFilterResult.pagination.records,
    0,
  );
}