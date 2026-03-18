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

export async function test_api_member_files_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Set up authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: authorizedMember.token.access,
    },
  };
  // Step 3: Retrieve paginated files list
  const requestBody: IHrmsFile.IRequest = {
    ownerType: null,
    ownerId: null,
    page: 1,
    limit: 20,
  } satisfies IHrmsFile.IRequest;
  const response: IPageIHrmsFile.ISummary =
    await api.functional.hrms.member.files.index(authenticatedConnection, {
      body: requestBody,
    });
  typia.assert(response);
  // Step 4: Validate pagination metadata structure and types
  typia.assert(response.pagination);
  TestValidator.predicate(
    "pagination has correct structure",
    (): boolean =>
      typeof response.pagination.current === "number" &&
      typeof response.pagination.limit === "number" &&
      typeof response.pagination.records === "number" &&
      typeof response.pagination.pages === "number",
  );
  // Step 5: Validate pagination values are reasonable
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 6: Validate pages calculation (should be ceiling of records / limit)
  const expectedPages = Math.max(
    1,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // Step 7: Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Step 8: Validate each file in data array
  for (let index = 0; index < response.data.length; index++) {
    const file = response.data[index];
    // Validate file structure
    typia.assert(file);
    // Validate required file fields exist and have correct types
    TestValidator.predicate(
      "file " + index + " has valid id",
      (): boolean => typeof file.id === "string",
    );
    TestValidator.predicate(
      "file " + index + " has valid filename",
      (): boolean =>
        typeof file.filename === "string" && file.filename.length > 0,
    );
    TestValidator.predicate(
      "file " + index + " has valid file_size",
      (): boolean => typeof file.file_size === "number" && file.file_size >= 0,
    );
    TestValidator.predicate(
      "file " + index + " has valid mime_type",
      (): boolean => typeof file.mime_type === "string",
    );
    TestValidator.predicate(
      "file " + index + " has valid file_category",
      (): boolean => typeof file.file_category === "string",
    );
    TestValidator.predicate(
      "file " + index + " has valid validation_status",
      (): boolean => typeof file.validation_status === "string",
    );
    // Validate organization context is present
    TestValidator.predicate(
      "file " + index + " has organization context",
      (): boolean =>
        file.organization !== null && file.organization !== undefined,
    );
    if (file.organization) {
      // Validate organization fields
      TestValidator.predicate(
        "file " + index + " organization has id",
        (): boolean => typeof file.organization.id === "string",
      );
      TestValidator.predicate(
        "file " + index + " organization has name",
        (): boolean => typeof file.organization.name === "string",
      );
    }
    // Validate timestamps are ISO 8601 format (type-checked by typia.assert already)
    TestValidator.predicate(
      "file " + index + " has valid created_at",
      (): boolean => file.created_at !== null && file.created_at !== undefined,
    );
    // Validate soft-deleted files are excluded by default
    // deleted_at should be null (not deleted) or undefined (not tracked)
    if (file.deleted_at !== null && file.deleted_at !== undefined) {
      throw new Error("Soft-deleted file found in results at index " + index);
    }
  }
  // Step 9: Validate multi-tenancy isolation (all files belong to member's org)
  if (
    response.data.length > 0 &&
    authorizedMember.organization_memberships.length > 0
  ) {
    // Get member's primary organization
    const primaryOrganization =
      authorizedMember.organization_memberships[0].organization;
    // Verify all returned files belong to the same organization
    for (let index = 0; index < response.data.length; index++) {
      const file = response.data[index];
      TestValidator.equals(
        "file " + index + " belongs to member's organization",
        file.organization.id,
        primaryOrganization.id,
      );
    }
  }
}
