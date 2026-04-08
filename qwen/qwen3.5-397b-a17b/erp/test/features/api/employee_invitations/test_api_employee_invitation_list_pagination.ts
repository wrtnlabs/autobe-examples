import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee invitations list endpoint with default pagination.
 *
 * Validates the complete employee invitations retrieval flow including member authentication, paginated list access, and response structure validation. Ensures that the pagination metadata is correctly returned and that each invitation summary contains all required fields including references to the inviting member, assigned role, and optional department.
 *
 * Special attention is given to verifying that soft-deleted invitations are excluded from results and that the response structure matches IPageIHrmPlatformEmployeeInvitation.ISummary with proper pagination information.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Retrieves employee invitations list with default pagination parameters.
 * 3. Validates pagination metadata structure (current, limit, records, pages).
 * 4. Validates each invitation summary contains required fields and nested relations.
 * 5. Verifies soft-deleted invitations are excluded (deleted_at is null).
 * 6. Tests with explicit pagination parameters to verify pagination functionality.
 */
export async function test_api_employee_invitation_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Retrieve employee invitations with default pagination
  const invitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(invitations);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => invitations.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () =>
      invitations.pagination.limit >= 1 && invitations.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => invitations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => invitations.pagination.pages >= 0,
  );
  // 4. Validate each invitation summary - business logic only
  for (const invitation of invitations.data) {
    // Validate soft-delete exclusion (deleted_at should be null for active records)
    TestValidator.equals(
      "invitation is not soft-deleted",
      invitation.deleted_at,
      null,
    );
    // Validate department reference if present
    if (invitation.department !== null) {
      const department = invitation.department;
      TestValidator.predicate(
        "department has valid id",
        () => department.id.length > 0,
      );
    }
  }
  // 5. Test with explicit pagination parameters
  const paginatedInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(paginatedInvitations);
  TestValidator.equals(
    "pagination current page matches",
    paginatedInvitations.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respects request",
    () => paginatedInvitations.pagination.limit <= 10,
  );
}