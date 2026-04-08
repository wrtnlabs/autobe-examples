import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test basic invitation listing functionality without filters.
 *
 * Validates that a member with employee:manage permission can retrieve all invitations in their organization. The response includes pagination metadata and invitation summaries containing status, email, role, inviter, and expiration information.
 *
 * Special attention is given to verifying the response structure matches IHrmEmployeeInvitation.ISummary format with proper organization, role, inviter, and member relation objects. The test also validates pagination handling with empty invitation lists.
 *
 * 1. Register a new member account with email and password.
 * 2. Create a member-specific connection and authenticate.
 * 3. Call invitation listing endpoint without any filters.
 * 4. Verify response structure and pagination metadata.
 * 5. Validate empty invitation list pagination handles zero records correctly.
 */
export async function test_api_invitation_listing_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create invitation listing request without filters
  const result: IPageIHrmEmployeeInvitation.ISummary =
    await api.functional.hrm.member.invitations.index(memberConnection, {
      body: {} satisfies IHrmEmployeeInvitation.IRequest,
    });
  typia.assert(result);
  // 3. Verify pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Verify data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Test empty invitation list pagination
  if (result.data.length === 0) {
    TestValidator.equals(
      "zero records pagination",
      result.pagination.records,
      0,
    );
    TestValidator.equals("zero records pages", result.pagination.pages, 0);
  } else {
    // 6. Validate invitation summary structure when invitations exist
    const invitation = result.data[0];
    typia.assert(invitation);
    // Verify required invitation properties
    TestValidator.predicate(
      "invitation has uuid id",
      /^[0-9a-f-]{36}$/i.test(invitation.id),
    );
    TestValidator.predicate(
      "invitation has valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email),
    );
    TestValidator.predicate(
      "invitation has valid status",
      ["pending", "accepted", "expired", "cancelled"].includes(
        invitation.status,
      ),
    );
    TestValidator.predicate(
      "invitation has valid expires_at",
      !isNaN(Date.parse(invitation.expires_at)),
    );
    TestValidator.predicate(
      "invitation has valid created_at",
      !isNaN(Date.parse(invitation.created_at)),
    );
    // Verify organization relation
    TestValidator.predicate(
      "invitation has organization",
      invitation.organization !== null && invitation.organization !== undefined,
    );
    TestValidator.predicate(
      "organization has uuid id",
      /^[0-9a-f-]{36}$/i.test(invitation.organization.id),
    );
    TestValidator.predicate(
      "organization has name",
      invitation.organization.name.length > 0,
    );
    // Verify role relation
    TestValidator.predicate(
      "invitation has role",
      invitation.role !== null && invitation.role !== undefined,
    );
    TestValidator.predicate(
      "role has uuid id",
      /^[0-9a-f-]{36}$/i.test(invitation.role.id),
    );
    TestValidator.predicate("role has name", invitation.role.name.length > 0);
    // Verify inviter relation
    TestValidator.predicate(
      "invitation has inviter",
      invitation.inviter !== null && invitation.inviter !== undefined,
    );
    TestValidator.predicate(
      "inviter has uuid id",
      /^[0-9a-f-]{36}$/i.test(invitation.inviter.id),
    );
    TestValidator.predicate(
      "inviter has valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.inviter.email),
    );
    // Verify member relation (optional, null for pending invitations)
    if (invitation.member !== null && invitation.member !== undefined) {
      TestValidator.predicate(
        "member has uuid id",
        /^[0-9a-f-]{36}$/i.test(invitation.member.id),
      );
      TestValidator.predicate(
        "member has valid email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.member.email),
      );
    }
  }
}
