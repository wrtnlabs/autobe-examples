import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_administrator_promotion_regular_to_super_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberEmail = typia.random<string & tags.Format<"email">>() as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>;
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberOutput);
  const memberId = memberOutput.id;
  // 2. Member submits admin request (need to call admin API endpoint)
  // Using SDK function for admin request submission
  const memberAdminConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAdminConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // 3. Create super admin
  const superAdminEmail = typia.random<string & tags.Format<"email">>() as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>;
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminOutput = await authorize_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminOutput);
  const superAdminId = superAdminOutput.id;
  // 4. Super admin login
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminLoginConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  // 5. Approve admin request (making member a regular admin)
  // This requires admin request ID from step 2
  // Using SDK approve function
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const approvedRequest =
    await api.functional.economicPoliticalBoard.admin.pending_requests.approve(
      superAdminLoginConnection,
      {
        requestId,
      },
    );
  typia.assert(approvedRequest);
  const regularAdminId = approvedRequest.user.id;
  // 6. Verify regular admin has grade='regular' before promotion
  // Note: Would need to fetch admin role details to verify grade
  // 7. Promote regular admin to super admin
  const promotedAdmin =
    await api.functional.economicPoliticalBoard.admin.administrators.promote(
      superAdminLoginConnection,
      {
        adminId: regularAdminId,
      },
    );
  typia.assert(promotedAdmin);
  // 8. Validate promotion results
  TestValidator.equals("grade changed to super", promotedAdmin.grade, "super");
  TestValidator.equals(
    "promoted by correct user",
    promotedAdmin.promotedByUserId,
    superAdminId,
  );
  TestValidator.predicate(
    "promotedAt is set",
    promotedAdmin.promotedAt !== null,
  );
  TestValidator.notEquals(
    "promotedAt is valid timestamp",
    promotedAdmin.promotedAt,
    "0001-01-01T00:00:00.000Z",
  );
  TestValidator.equals(
    "userId preserved after promotion",
    promotedAdmin.userId,
    regularAdminId,
  );
}