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

export async function test_api_files_edge_cases_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create a separate connection with the member's token
  const memberTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Step 2: Create a test organization to work with
  // Note: Organization creation may require admin access, so we'll use random UUIDs
  // to test organization isolation (non-existent organizations should be rejected)
  const validOrganizationId =
    memberAuth.organization_memberships[0]?.organization.id;
  TestValidator.predicate(
    "member has at least one organization",
    () => validOrganizationId !== undefined && validOrganizationId !== null,
  );
  // Generate an organization ID that the member does NOT belong to
  const inaccessibleOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Test organization isolation - request files from organization user doesn't belong to
  await TestValidator.error(
    "should reject files request for organization user doesn't belong to",
    async () => {
      await api.functional.hrms.member.organizations.files.index(
        memberTokenConnection,
        {
          organizationId: inaccessibleOrganizationId,
          body: {
            ownerType: null,
            ownerId: null,
          },
        },
      );
    },
  );
  // Step 4: Test empty results with invalid filename filter
  const noMatchResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          filename: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
        },
      },
    );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "empty filename filter returns empty data",
    noMatchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty filename filter pagination records is zero",
    noMatchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filename filter pagination pages is zero",
    noMatchResponse.pagination.pages,
    0,
  );
  // Step 5: Test empty results with future date range
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureDateRangeResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          startDate: futureDate.toISOString(),
          endDate: futureDate.toISOString(),
        },
      },
    );
  typia.assert(futureDateRangeResponse);
  TestValidator.equals(
    "future date range returns empty data",
    futureDateRangeResponse.data.length,
    0,
  );
  TestValidator.equals(
    "future date range pagination records is zero",
    futureDateRangeResponse.pagination.records,
    0,
  );
  // Step 6: Test pagination metadata on last page with empty results
  const lastPageEmptyResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          page: 999,
          limit: 10,
          filename: "nonexistent_file_name",
        },
      },
    );
  typia.assert(lastPageEmptyResponse);
  TestValidator.equals(
    "last page empty pagination current is 999",
    lastPageEmptyResponse.pagination.current,
    999,
  );
  TestValidator.equals(
    "last page empty pagination limit is 10",
    lastPageEmptyResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "last page empty pagination records is zero",
    lastPageEmptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "last page empty pagination pages is zero",
    lastPageEmptyResponse.pagination.pages,
    0,
  );
  // Step 7: Test includeDeleted parameter (admin capability to include soft-deleted files)
  const includeDeletedResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          includeDeleted: true,
        },
      },
    );
  typia.assert(includeDeletedResponse);
  // The response should be valid even with includeDeleted=true
  // Note: actual deleted files presence depends on test data setup
  // Step 8: Test pagination with maximum limit
  const maxLimitResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Step 9: Test pagination with page=1 and default limit
  const firstPageResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          page: 1,
        },
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page pagination current is 1",
    firstPageResponse.pagination.current,
    1,
  );
  // Step 10: Test sorting with different sort fields
  const sortByFilenameAscResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          sortBy: "filename",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByFilenameAscResponse);
  const sortByCreatedDescResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByCreatedDescResponse);
  // Step 11: Test validation status filter
  const validationStatusFilterResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          validationStatus: "validated",
        },
      },
    );
  typia.assert(validationStatusFilterResponse);
  // Step 12: Test file category filter
  const categoryFilterResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          category: "document",
        },
      },
    );
  typia.assert(categoryFilterResponse);
  // Step 13: Test ownerType and ownerId filtering
  const memberOwnerFilterResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: "member",
          ownerId: memberAuth.id,
        },
      },
    );
  typia.assert(memberOwnerFilterResponse);
  // Step 14: Test sorting by file_size
  const sortByFileSizeResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          sortBy: "file_size",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByFileSizeResponse);
  // Step 15: Test sorting by validation_status
  const sortByValidationStatusResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          sortBy: "validation_status",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByValidationStatusResponse);
  // Step 16: Test sorting by file_category
  const sortByFileCategoryResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          sortBy: "file_category",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortByFileCategoryResponse);
  // Step 17: Test sorting by updated_at
  const sortByUpdatedResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          sortBy: "updated_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortByUpdatedResponse);
  // Step 18: Test pagination with small limit
  const smallLimitResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          limit: 1,
        },
      },
    );
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit pagination limit is 1",
    smallLimitResponse.pagination.limit,
    1,
  );
  // Step 19: Test pagination with limit=2
  const limitTwoResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          limit: 2,
        },
      },
    );
  typia.assert(limitTwoResponse);
  TestValidator.equals(
    "limit 2 pagination limit is 2",
    limitTwoResponse.pagination.limit,
    2,
  );
  // Step 20: Test pagination with page=2 (when there may be more than one page)
  const pageTwoResponse =
    await api.functional.hrms.member.organizations.files.index(
      memberTokenConnection,
      {
        organizationId: validOrganizationId!,
        body: {
          ownerType: null,
          ownerId: null,
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(pageTwoResponse);
  TestValidator.equals(
    "page 2 pagination current is 2",
    pageTwoResponse.pagination.current,
    2,
  );
}
