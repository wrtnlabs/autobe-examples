import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberPasswordReset";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Join as a new member to obtain authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Test Data Preparation: Generate a password reset record
  const resetRecord: IHrmsMemberPasswordReset =
    typia.random<IHrmsMemberPasswordReset>();
  typia.assert(resetRecord);
  // 3. Execute Retrieval: Retrieve the password reset record
  const retrieved: IHrmsMemberPasswordReset =
    await api.functional.hrms.member.password_resets.at(memberConnection, {
      resetId: resetRecord.id,
    });
  typia.assert(retrieved);
  // 4. Response Validation: Validate all required fields exist and have correct types
  TestValidator.equals("has id", retrieved.id, resetRecord.id);
  TestValidator.equals(
    "has hrms_member_id",
    retrieved.hrms_member_id,
    resetRecord.hrms_member_id,
  );
  TestValidator.equals(
    "has expires_at",
    retrieved.expires_at,
    resetRecord.expires_at,
  );
  TestValidator.equals("has used_at", retrieved.used_at, resetRecord.used_at);
  TestValidator.equals(
    "has created_at",
    retrieved.created_at,
    resetRecord.created_at,
  );
  TestValidator.equals(
    "has updated_at",
    retrieved.updated_at,
    resetRecord.updated_at,
  );
  // 5. Business Logic Validation: Validate business rules
  TestValidator.equals(
    "hrms_member_id matches authenticated member",
    retrieved.hrms_member_id,
    member.id,
  );
  TestValidator.equals(
    "used_at is null (token not consumed)",
    retrieved.used_at,
    null,
  );
  // Validate expires_at is a future timestamp
  const expiresDate = new Date(retrieved.expires_at);
  const now = new Date();
  TestValidator.predicate(
    "expires_at is in the future",
    () => expiresDate.getTime() > now.getTime(),
  );
  // Validate all timestamps are valid ISO 8601 date-time format (typia.assert already validates types)
}