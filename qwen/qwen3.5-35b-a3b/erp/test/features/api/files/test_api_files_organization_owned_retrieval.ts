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

export async function test_api_files_organization_owned_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(auth);
  // Use the first organization if available, otherwise create a test organization
  const organizationId =
    auth.organization_memberships.length > 0
      ? auth.organization_memberships[0].organization.id
      : typia.assert<string & tags.Format<"uuid">>(typia.random<string>());
  // 2. Retrieve organization-owned files (ownerType=organization, ownerId=null)
  const organizationFileList =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(organizationFileList);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    organizationFileList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    organizationFileList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    organizationFileList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    organizationFileList.pagination.pages >= 0,
  );
  // 4. Validate all returned files have null/undefined owner (organization-owned)
  for (const file of organizationFileList.data) {
    TestValidator.predicate(
      "file owner is null for organization-owned",
      file.owner === null || file.owner === undefined,
    );
    TestValidator.predicate(
      "file has valid filename",
      file.filename.length > 0,
    );
    TestValidator.predicate("file size is non-negative", file.file_size >= 0);
    TestValidator.predicate("file has mime type", file.mime_type.length > 0);
    TestValidator.predicate("file has category", file.file_category.length > 0);
    TestValidator.predicate(
      "file has validation status",
      file.validation_status.length > 0,
    );
    TestValidator.predicate(
      "file has organization",
      file.organization !== null && file.organization !== undefined,
    );
  }
  // 5. Test filtering by file_category
  const logoFiles = await api.functional.hrms.member.organizations.files.index(
    memberConnection,
    {
      organizationId,
      body: {
        ownerType: "organization",
        ownerId: null,
        category: "organization_logo",
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(logoFiles);
  for (const file of logoFiles.data) {
    TestValidator.equals(
      "category is organization_logo",
      file.file_category,
      "organization_logo",
    );
  }
  // 6. Test filtering by validation_status
  const validatedFiles =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
          validationStatus: "validated",
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(validatedFiles);
  for (const file of validatedFiles.data) {
    TestValidator.equals(
      "validation status is validated",
      file.validation_status,
      "validated",
    );
  }
  // 7. Test multi-filter combination (category + validationStatus)
  const logoValidatedFiles =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
          category: "organization_logo",
          validationStatus: "validated",
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(logoValidatedFiles);
  for (const file of logoValidatedFiles.data) {
    TestValidator.equals(
      "category is organization_logo",
      file.file_category,
      "organization_logo",
    );
    TestValidator.equals(
      "validation status is validated",
      file.validation_status,
      "validated",
    );
  }
  // 8. Test sorting by filename ascending
  const sortedByNameAsc =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
          sortBy: "filename",
          sortOrder: "asc",
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(sortedByNameAsc);
  // 9. Test sorting by filename descending
  const sortedByNameDesc =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
          sortBy: "filename",
          sortOrder: "desc",
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(sortedByNameDesc);
  // 10. Test sorting by file_size
  const sortedBySizeAsc =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
          sortBy: "file_size",
          sortOrder: "asc",
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(sortedBySizeAsc);
  const sortedBySizeDesc =
    await api.functional.hrms.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          ownerType: "organization",
          ownerId: null,
          sortBy: "file_size",
          sortOrder: "desc",
        } satisfies IHrmsFile.IRequest,
      },
    );
  typia.assert(sortedBySizeDesc);
}