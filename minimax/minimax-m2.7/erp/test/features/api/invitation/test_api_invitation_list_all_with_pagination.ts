import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_invitation_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Get all invitations with empty body
  const allInvitations = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(allInvitations);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    allInvitations.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    allInvitations.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    allInvitations.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is valid",
    allInvitations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is valid",
    allInvitations.pagination.pages >= 0,
  );
  // 4. Validate pages calculation
  if (allInvitations.pagination.records > 0) {
    const expectedPages = Math.ceil(
      allInvitations.pagination.records / allInvitations.pagination.limit,
    );
    TestValidator.equals(
      "pages matches calculation",
      allInvitations.pagination.pages,
      expectedPages,
    );
  }
  // 5. Test pagination with different page and limit
  const pageSize = Math.min(5, allInvitations.pagination.records || 5);
  const firstPage = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: pageSize,
      },
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize,
  );
  // 6. Test second page if available
  if (allInvitations.pagination.pages > 1) {
    const secondPage = await api.functional.erpHrm.member.invitations.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: pageSize,
        },
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      pageSize,
    );
    // Verify no overlap between pages
    const firstPageIds = firstPage.data.map((inv) => inv.id);
    const secondPageIds = secondPage.data.map((inv) => inv.id);
    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
    TestValidator.equals("no overlap between pages", hasOverlap, false);
  }
  // 7. Validate data structure of invitations
  for (const invitation of allInvitations.data) {
    typia.assert(invitation);
    TestValidator.equals(
      "email format valid",
      invitation.email.includes("@"),
      true,
    );
    TestValidator.predicate(
      "status is valid",
      ["pending", "accepted", "expired"].includes(invitation.status),
    );
    TestValidator.equals(
      "organization exists",
      invitation.organization !== null,
      true,
    );
  }
}
