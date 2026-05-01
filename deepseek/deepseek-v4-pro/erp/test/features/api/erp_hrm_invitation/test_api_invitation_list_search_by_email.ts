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
 * Test invitation email search with case-insensitive partial matching and pagination validation.
 *
 * Validates that the PATCH /erpHrm/member/invitations endpoint correctly filters invitations by email substring in a case-insensitive manner. Ensures that only invitations whose invited email address contains the search term are returned, and that non-matching invitations are excluded from results.
 *
 * Pagination metadata is validated to confirm that the records count accurately reflects the number of invitations matching the email filter, and that page structure (current, limit, records, pages) is internally consistent. An additional search with a guaranteed non-matching string verifies that the endpoint returns an empty dataset with zero records when no invitations match.
 *
 * 1. Authenticate a member via authorize_member_join to obtain an authorized connection.
 * 2. Fetch all invitations without any email filter to establish a baseline dataset.
 * 3. Extract a partial substring from an existing invitation's email and search with both lowercase and uppercase variants to prove case-insensitive matching.
 * 4. Validate that every returned invitation's email contains the search term case-insensitively.
 * 5. Validate that non-matching invitations from the baseline are excluded from filtered results.
 * 6. Validate pagination metadata reflects the correct filtered count and internal consistency.
 * 7. Search with a guaranteed non-matching string and verify empty results with zero pagination records.
 */
export async function test_api_invitation_list_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Fetch all invitations without email filter for baseline
  const allResult = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(allResult);
  // Validate baseline pagination consistency
  TestValidator.predicate(
    "baseline pagination: current >= 1",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "baseline pagination: data length <= limit",
    allResult.data.length <= allResult.pagination.limit,
  );
  TestValidator.predicate(
    "baseline pagination: records >= data.length",
    allResult.pagination.records >= allResult.data.length,
  );
  // 3. If invitations exist, test partial email matching with case insensitivity
  if (allResult.data.length > 0) {
    const sampleEmail = allResult.data[0].email;
    const atIndex = sampleEmail.indexOf("@");
    const start = Math.min(2, Math.max(0, atIndex - 1));
    const end = Math.min(6, atIndex);
    const searchTerm = sampleEmail.substring(start, end);
    // Search with lowercase variant
    const lowerSearchTerm = searchTerm.toLowerCase();
    const lowerResult = await api.functional.erpHrm.member.invitations.index(
      memberConnection,
      {
        body: {
          email: lowerSearchTerm,
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
    typia.assert(lowerResult);
    // Search with uppercase variant to verify case-insensitivity
    const upperSearchTerm = searchTerm.toUpperCase();
    const upperResult = await api.functional.erpHrm.member.invitations.index(
      memberConnection,
      {
        body: {
          email: upperSearchTerm,
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
    typia.assert(upperResult);
    // Lowercase and uppercase searches should return same results
    TestValidator.equals(
      "lowercase and uppercase search return same count",
      lowerResult.pagination.records,
      upperResult.pagination.records,
    );
    // 4. Validate all returned invitations have emails containing the search term (case-insensitive)
    for (const invitation of upperResult.data) {
      TestValidator.predicate(
        `invitation email "${invitation.email}" contains search term "${searchTerm}" case-insensitively`,
        invitation.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    // 5. Validate non-matching invitations from baseline are excluded
    const filteredIds = new Set(upperResult.data.map((inv) => inv.id));
    for (const invitation of allResult.data) {
      if (!invitation.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        TestValidator.predicate(
          `non-matching invitation "${invitation.email}" is excluded from filtered results`,
          !filteredIds.has(invitation.id),
        );
      }
    }
    // 6. Validate pagination metadata reflects filtered count
    const expectedMatchCount = allResult.data.filter((inv) =>
      inv.email.toLowerCase().includes(searchTerm.toLowerCase()),
    ).length;
    TestValidator.equals(
      "pagination records equals filtered count",
      upperResult.pagination.records,
      expectedMatchCount,
    );
    // Validate filtered pagination consistency
    TestValidator.predicate(
      "filtered pagination: data length <= limit",
      upperResult.data.length <= upperResult.pagination.limit,
    );
    TestValidator.predicate(
      "filtered pagination: pages calculation consistent",
      upperResult.pagination.pages ===
        Math.ceil(
          upperResult.pagination.records / upperResult.pagination.limit,
        ),
    );
  }
  // 7. Search with a guaranteed non-matching string
  const noMatchResult = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        email: "xyznonexistentmatch987654321",
      } satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no-match search returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no-match pagination records is zero",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match pagination pages is zero",
    noMatchResult.pagination.pages,
    0,
  );
}
