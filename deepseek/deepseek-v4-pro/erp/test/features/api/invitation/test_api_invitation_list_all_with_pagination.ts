import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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

/**
 * Test invitation listing with default pagination and no filters.
 *
 * Authenticates a new member and retrieves all invitations for the current organization using default pagination parameters. Validates the response shape, pagination metadata integrity, invitation record structure, and descending chronological ordering.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Call the invitation index endpoint with an empty request body (default pagination, no filters).
 * 3. Validate the full response structure with typia.assert.
 * 4. Verify pagination metadata: current page, limit, total records, and total pages relationship.
 * 5. Validate each invitation record contains id, email, status, inviter, and created_at fields.
 * 6. Assert records are sorted by created_at in descending order (newest first).
 */
export async function test_api_invitation_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. List all invitations with default pagination (no filters)
  const page = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate pagination metadata
  const pagination = page.pagination;
  TestValidator.predicate(
    "current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", pagination.limit >= 1);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Validate data array length respects pagination limit
  TestValidator.predicate(
    "data length does not exceed limit",
    page.data.length <= pagination.limit,
  );
  // 5. Validate each invitation record has required fields
  for (const invitation of page.data) {
    TestValidator.predicate(
      "invitation has id",
      typeof invitation.id === "string" && invitation.id.length > 0,
    );
    TestValidator.predicate(
      "invitation has email",
      typeof invitation.email === "string" && invitation.email.length > 0,
    );
    TestValidator.predicate(
      "invitation has valid status",
      ["pending", "fulfilled", "revoked"].includes(invitation.status),
    );
    TestValidator.predicate(
      "invitation has inviter",
      invitation.inviter !== null && invitation.inviter !== undefined,
    );
    TestValidator.predicate(
      "invitation has created_at",
      typeof invitation.created_at === "string" &&
        invitation.created_at.length > 0,
    );
  }
  // 6. Validate ordering: sorted by created_at descending
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        "invitations sorted by created_at descending",
        new Date(page.data[i - 1].created_at).getTime() >=
          new Date(page.data[i].created_at).getTime(),
      );
    }
  }
}
