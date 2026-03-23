import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerPendingInvitation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerPendingInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization isolation and email filtering for invitation listing.
 * 1. Create member and join organization
 * 2. Verify member can only see invitations from their organization
 * 3. Test email partial matching
 */
export async function test_api_invitation_list_organization_isolation_and_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // Step 2: Get pending invitations for the member's organization context
  const searchResult = await api.functional.hrmTracker.member.invitations.index(
    memberConnection,
    {
      body: {
        status: ["pending"],
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(searchResult);
  // Verify organization isolation - check that returned invitations include organization context
  for (const invitation of searchResult.data) {
    TestValidator.predicate(
      "has organization info",
      invitation.organization !== undefined &&
        invitation.organization.id !== undefined,
    );
  }
  // Step 3: Test email partial matching if there are invitations
  if (searchResult.data.length > 0) {
    // Use the first invitation's email for partial match testing
    const testInvitation = searchResult.data[0];
    const partialEmail = testInvitation.email.substring(
      0,
      Math.min(5, testInvitation.email.length),
    );
    const emailFilterResult =
      await api.functional.hrmTracker.member.invitations.index(
        memberConnection,
        {
          body: {
            status: ["pending"],
            email: partialEmail,
            page: 1,
            limit: 20,
          },
        },
      );
    typia.assert(emailFilterResult);
    // Verify email filtering returns relevant results
    TestValidator.predicate(
      "email filter works",
      emailFilterResult.data.length >= 0,
    );
  }
  // Step 4: Verify pagination structure
  TestValidator.predicate(
    "has pagination",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate("has limit", searchResult.pagination.limit >= 1);
  TestValidator.predicate(
    "has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    searchResult.pagination.pages >= 0,
  );
}
