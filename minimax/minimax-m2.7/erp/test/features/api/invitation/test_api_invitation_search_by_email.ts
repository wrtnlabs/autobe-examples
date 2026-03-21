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

export async function test_api_invitation_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique search term for email partial matching test
  const searchTerm = RandomGenerator.alphaNumeric(8) + ".com";
  // Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Search invitations by email partial match (ILIKE '%' || email || '%')
  const result = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        email: searchTerm satisfies string & tags.Format<"email">,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(result);
  // Validate that all returned invitations contain the search term in their email (case-insensitive)
  for (const invitation of result.data) {
    TestValidator.predicate(
      `Invitation email contains search term`,
      invitation.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // Test combining email search with status filter
  const combinedResult = await api.functional.erpHrm.member.invitations.index(
    memberConnection,
    {
      body: {
        email: searchTerm satisfies string & tags.Format<"email">,
        status: "pending",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IErpHrmInvitation.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Validate combined filter results
  for (const invitation of combinedResult.data) {
    TestValidator.equals(
      "Invitation status matches filter",
      invitation.status,
      "pending",
    );
    TestValidator.predicate(
      `Invitation email contains search term with status filter`,
      invitation.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}
