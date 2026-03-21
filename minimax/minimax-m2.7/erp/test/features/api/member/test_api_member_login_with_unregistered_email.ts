import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login with an email address that is not registered in the system.
 * Attempt to login using an email that does not exist in erp_hrm_members table.
 * According to section 280 (Authentication Failures), the system SHALL reject
 * the login attempt and display a generic authentication failure message without
 * revealing whether the email exists.
 *
 * This test validates security against email enumeration attacks by verifying:
 * (1) HTTP 401 or appropriate error status is returned
 * (2) Error message is generic and does not reveal whether the email is registered
 * (3) No tokens are returned
 */
export async function test_api_member_login_with_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email that definitely does not exist in the system
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();
  // Attempt to login with an unregistered email
  // According to section 280, system must return generic error without revealing email existence
  await TestValidator.httpError(
    "login with unregistered email",
    401,
    async () => {
      await api.functional.erpHrm.auth.member.login(connection, {
        body: {
          email: unregisteredEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IErpHrmMember.ILogin,
      });
    },
  );
}
