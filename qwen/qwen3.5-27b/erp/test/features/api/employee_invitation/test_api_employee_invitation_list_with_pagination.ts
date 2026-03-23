import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test employee invitation listing with pagination functionality.
 *
 * This test verifies:
 * 1. Admin authentication and authorization
 * 2. Paginated retrieval of employee invitations
 * 3. Response structure validation
 * 4. Pagination metadata accuracy
 * 5. Sorting by created_at descending
 */
export async function test_api_employee_invitation_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. List invitations with pagination (page 1)
  const page1Response =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(page1Response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data array length matches limit or total records",
    page1Response.data.length <= page1Response.pagination.limit,
  );
  // 5. Validate each invitation summary structure
  for (const invitation of page1Response.data) {
    // Verify required fields exist
    TestValidator.predicate(
      `invitation has valid UUID: ${invitation.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        invitation.id,
      ),
    );
    TestValidator.predicate(
      `invitation has valid email: ${invitation.email}`,
      invitation.email.includes("@"),
    );
    TestValidator.predicate(
      `invitation has valid status: ${invitation.status}`,
      ["pending", "accepted", "expired", "revoked"].includes(invitation.status),
    );
    // Verify organization info exists
    TestValidator.predicate(
      `invitation has organization id`,
      invitation.organization.id !== undefined,
    );
    TestValidator.predicate(
      `invitation has organization name`,
      invitation.organization.name !== undefined,
    );
    // Verify role info exists
    TestValidator.predicate(
      `invitation has role id`,
      invitation.role.id !== undefined,
    );
    TestValidator.predicate(
      `invitation has role name`,
      invitation.role.name !== undefined,
    );
    // Verify timestamps exist
    TestValidator.predicate(
      `invitation has valid expires_at`,
      invitation.expires_at !== undefined,
    );
    TestValidator.predicate(
      `invitation has valid created_at`,
      invitation.created_at !== undefined,
    );
    TestValidator.predicate(
      `invitation has valid updated_at`,
      invitation.updated_at !== undefined,
    );
  }
  // 6. Verify sorting by created_at descending (if multiple invitations exist)
  if (page1Response.data.length > 1) {
    for (let i = 1; i < page1Response.data.length; i++) {
      const prevCreated = new Date(
        page1Response.data[i - 1].created_at,
      ).getTime();
      const currCreated = new Date(page1Response.data[i].created_at).getTime();
      TestValidator.predicate(
        `invitations sorted by created_at descending (index ${i - 1} >= ${i})`,
        prevCreated >= currCreated,
      );
    }
  }
  // 7. Test pagination - request page 2
  const page2Response =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(page2Response);
  // 8. Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Response.pagination.limit,
    10,
  );
  // 9. Verify page 2 has different or no data compared to page 1
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = new Set(page1Response.data.map((inv) => inv.id));
    const page2Ids = new Set(page2Response.data.map((inv) => inv.id));
    // Check that page 2 has different invitations than page 1
    const hasOverlap = Array.from(page2Ids).some((id) => page1Ids.has(id));
    TestValidator.predicate(
      "page 2 contains different invitations than page 1",
      !hasOverlap,
    );
  }
  // 10. Test filtering by status
  const pendingResponse =
    await api.functional.hrmPlatform.admin.invitations.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies IHrmPlatformEmployeeInvitation.IRequest,
    });
  typia.assert(pendingResponse);
  // 11. Verify all returned invitations have pending status
  for (const invitation of pendingResponse.data) {
    TestValidator.equals(
      `filtered invitation status is pending: ${invitation.id}`,
      invitation.status,
      "pending",
    );
  }
  // 12. Test search by email
  if (page1Response.data.length > 0) {
    const searchEmail = page1Response.data[0].email;
    const searchResponse =
      await api.functional.hrmPlatform.admin.invitations.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            search: searchEmail,
          } satisfies IHrmPlatformEmployeeInvitation.IRequest,
        },
      );
    typia.assert(searchResponse);
    // Verify search results contain the searched email
    TestValidator.predicate(
      "search results contain the searched email",
      searchResponse.data.some((inv) => inv.email === searchEmail),
    );
  }
}
