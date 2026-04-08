import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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

export async function test_api_invitation_bulk_duplicate_email_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create member account (whose email will be used for duplicate detection)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const memberEmail = member.email;
  // 3. First bulk invitation - should succeed (creates employee for existing member)
  const firstResult =
    await api.functional.erpHrm.admin.invitations.bulk.createBulk(
      adminConnection,
      {
        body: {
          email: memberEmail,
        } satisfies IErpHrmInvitation.IBulkCreate,
      },
    );
  typia.assert(firstResult);
  // Validate first invitation succeeded
  TestValidator.equals(
    "first invitation has successes",
    firstResult.successes.length > 0,
    true,
  );
  TestValidator.equals(
    "first invitation has no failures",
    firstResult.failures.length,
    0,
  );
  // 4. Second bulk invitation with SAME email - should fail with duplicate error
  const secondResult =
    await api.functional.erpHrm.admin.invitations.bulk.createBulk(
      adminConnection,
      {
        body: {
          email: memberEmail,
        } satisfies IErpHrmInvitation.IBulkCreate,
      },
    );
  typia.assert(secondResult);
  // Validate duplicate detection
  TestValidator.equals(
    "duplicate invitation has no successes",
    secondResult.successes.length,
    0,
  );
  TestValidator.predicate(
    "duplicate invitation has failures",
    secondResult.failures.length > 0,
  );
  // Validate failure contains DUPLICATE_EMAIL or EXISTING_EMPLOYEE error code
  const failure = secondResult.failures[0];
  TestValidator.equals(
    "failure email matches input",
    failure.email,
    memberEmail satisfies string as string & tags.Format<"idn-email">,
  );
  TestValidator.predicate(
    "failure has DUPLICATE_EMAIL or EXISTING_EMPLOYEE error code",
    failure.error.code === "DUPLICATE_EMAIL" ||
      failure.error.code === "EXISTING_EMPLOYEE",
  );
}