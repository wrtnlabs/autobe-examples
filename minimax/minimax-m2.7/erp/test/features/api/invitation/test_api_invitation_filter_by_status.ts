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

export async function test_api_invitation_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to obtain access token
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test filtering invitations by different status values
  const statusValues = ["pending", "accepted", "expired"] as const;
  for (const status of statusValues) {
    // Filter by status and validate all returned invitations have matching status
    const filteredResult = await api.functional.erpHrm.member.invitations.index(
      memberConnection,
      {
        body: {
          status: status,
          limit: 20,
          page: 1,
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
    typia.assert(filteredResult);
    // Validate all returned invitations have the matching status
    for (const invitation of filteredResult.data) {
      TestValidator.equals(
        `invitation status should be ${status}`,
        invitation.status,
        status,
      );
    }
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination should be valid",
      filteredResult.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit should match request",
      filteredResult.pagination.limit === 20,
    );
    TestValidator.predicate(
      "pagination records should be non-negative",
      filteredResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages should be non-negative",
      filteredResult.pagination.pages >= 0,
    );
  }
  // 3. Test pagination within filtered results
  const pendingResult = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        status: "pending",
        limit: 5,
        page: 1,
      } satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(pendingResult);
  // Validate all items in the page have pending status
  for (const invitation of pendingResult.data) {
    TestValidator.equals(
      "all items in pending filter should have pending status",
      invitation.status,
      "pending",
    );
  }
  // Validate pagination works correctly
  TestValidator.equals("limit should be 5", pendingResult.pagination.limit, 5);
  TestValidator.equals(
    "current page should be 1",
    pendingResult.pagination.current,
    1,
  );
  // 4. Test page 2 of filtered results
  if (pendingResult.pagination.pages > 1) {
    const page2Result = await api.functional.erpHrm.member.invitations.index(
      memberConnection,
      {
        body: {
          status: "pending",
          limit: 5,
          page: 2,
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
    typia.assert(page2Result);
    // Validate page 2 items also have pending status
    for (const invitation of page2Result.data) {
      TestValidator.equals(
        "page 2 items should have pending status",
        invitation.status,
        "pending",
      );
    }
    // Validate page 2 is different from page 1
    if (page2Result.data.length > 0 && pendingResult.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 should return different invitation IDs",
        pendingResult.data[0]?.id,
        page2Result.data[0]?.id,
      );
    }
  }
  // 5. Test accepted status filter with pagination
  const acceptedResult = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        status: "accepted",
        limit: 10,
        page: 1,
      } satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(acceptedResult);
  for (const invitation of acceptedResult.data) {
    TestValidator.equals(
      "all items in accepted filter should have accepted status",
      invitation.status,
      "accepted",
    );
  }
  // 6. Test expired status filter with pagination
  const expiredResult = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        status: "expired",
        limit: 10,
        page: 1,
      } satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(expiredResult);
  for (const invitation of expiredResult.data) {
    TestValidator.equals(
      "all items in expired filter should have expired status",
      invitation.status,
      "expired",
    );
  }
}
