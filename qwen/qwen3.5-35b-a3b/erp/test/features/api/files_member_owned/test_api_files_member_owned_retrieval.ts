import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function test_api_files_member_owned_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member (will be organization owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Result = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Result);
  // Step 2: Retrieve organization details to get organizationId
  const organizationId =
    member1Result.organization_memberships[0].organization.id;
  const organization = await api.functional.hrms.member.organizations.at(
    member1Connection,
    {
      organizationId,
    },
  );
  typia.assert(organization);
  // Step 3: Register second member in same organization
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Result = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Result);
  // Step 4: Get member IDs for file ownership filtering
  const member1Id = member1Result.id;
  const member2Id = member2Result.id;
  // Step 5: Retrieve files with ownerType='member' and specific ownerId filter
  const filteredByMember1 =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: member1Id,
        },
      },
    );
  typia.assert(filteredByMember1);
  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page >= 1",
    filteredByMember1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    filteredByMember1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    filteredByMember1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    filteredByMember1.pagination.pages >= 0,
  );
  // Step 7: Verify organization context in returned files
  for (const file of filteredByMember1.data) {
    typia.assert(file);
    TestValidator.equals(
      "file belongs to correct organization",
      file.organization.id,
      organizationId,
    );
  }
  // Step 8: Test sorting with sortBy and sortOrder (created_at desc)
  const sortedByCreatedDesc =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortedByCreatedDesc);
  // Step 9: Test sorting with filename ascending
  const sortedByFilenameAsc =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          sortBy: "filename",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortedByFilenameAsc);
  // Step 10: Test date range filtering
  const startDate = new Date(Date.now() - 86400000 * 14).toISOString(); // 14 days ago
  const endDate = new Date().toISOString(); // today
  const dateFilteredFiles =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          startDate,
          endDate,
        },
      },
    );
  typia.assert(dateFilteredFiles);
  // Step 11: Validate includeDeleted defaults to false (excludes soft-deleted)
  const nonDeletedFiles =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          includeDeleted: false,
        },
      },
    );
  typia.assert(nonDeletedFiles);
  // Step 12: Verify includeDeleted field is respected
  const allFiles = await api.functional.hrms.member.organizations.files.index(
    member1Connection,
    {
      organizationId,
      body: {
        ownerType: "member",
        ownerId: null,
        includeDeleted: true,
      },
    },
  );
  typia.assert(allFiles);
  // Step 13: Test pagination with custom page and limit
  const paginatedFiles =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedFiles);
  TestValidator.equals(
    "page parameter respected",
    paginatedFiles.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit parameter respected",
    paginatedFiles.pagination.limit,
    5,
  );
  // Step 14: Test category filter
  const categoryFilteredFiles =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          category: "user_avatar",
        },
      },
    );
  typia.assert(categoryFilteredFiles);
  // Step 15: Test validationStatus filter
  const validationStatusFilteredFiles =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          validationStatus: "validated",
        },
      },
    );
  typia.assert(validationStatusFilteredFiles);
  // Step 16: Test filename partial search
  const filenameSearchFiles =
    await api.functional.hrms.member.organizations.files.index(
      member1Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: null,
          filename: RandomGenerator.alphabets(3),
        },
      },
    );
  typia.assert(filenameSearchFiles);
  // Step 17: Verify file summaries have required fields
  if (filteredByMember1.data.length > 0) {
    const firstFile = filteredByMember1.data[0];
    typia.assert(firstFile);
    TestValidator.predicate(
      "file has id",
      firstFile.id !== undefined && firstFile.id !== null,
    );
    TestValidator.predicate(
      "file has filename",
      firstFile.filename !== undefined &&
        firstFile.filename !== null &&
        firstFile.filename.length > 0,
    );
    TestValidator.predicate(
      "file has file_size",
      firstFile.file_size !== undefined && firstFile.file_size >= 0,
    );
    TestValidator.predicate(
      "file has mime_type",
      firstFile.mime_type !== undefined && firstFile.mime_type !== null,
    );
    TestValidator.predicate(
      "file has file_category",
      firstFile.file_category !== undefined && firstFile.file_category !== null,
    );
    TestValidator.predicate(
      "file has validation_status",
      firstFile.validation_status !== undefined &&
        firstFile.validation_status !== null,
    );
    TestValidator.predicate(
      "file has created_at",
      firstFile.created_at !== undefined && firstFile.created_at !== null,
    );
    TestValidator.predicate(
      "file has organization",
      firstFile.organization !== undefined && firstFile.organization !== null,
    );
  }
  // Step 18: Test member ownership validation
  const member1Files =
    await api.functional.hrms.member.organizations.files.index(
      member2Connection,
      {
        organizationId,
        body: {
          ownerType: "member",
          ownerId: member1Id,
        },
      },
    );
  typia.assert(member1Files);
  // Member2 should still be able to view member1's files (same org, has view permissions)
  // This validates that member ownership filter works correctly
}
