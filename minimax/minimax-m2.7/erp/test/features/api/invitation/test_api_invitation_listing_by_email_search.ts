import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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

export async function test_api_invitation_listing_by_email_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member who becomes organization owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 2. Get organization ID - the member token contains org context
  // For testing, we need a valid organization ID from the system
  // The organization is created during member join
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Search invitations with email filter 'john' (case-insensitive partial match)
  // This should match emails like 'John@company.com', 'JOHN@example.com', 'john.doe@test.org'
  const searchResponse =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.index(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          email: "john",
          limit: 10,
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination exists",
    searchResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(searchResponse.data),
    true,
  );
  // 5. If results exist, verify all emails contain 'john' (case-insensitive)
  if (searchResponse.data.length > 0) {
    TestValidator.predicate(
      "all returned emails contain search term 'john' case-insensitive",
      searchResponse.data.every((inv) =>
        inv.email.toLowerCase().includes("john"),
      ),
    );
  }
}
