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

export async function test_api_password_reset_retrieve_used_token_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create connection with token for subsequent API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: `Bearer ${member.token.access}` };
  // 3. Generate a random reset ID to test the endpoint structure
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve password reset record
  const resetRecord = await api.functional.hrms.member.password_resets.at(
    memberConnection,
    { resetId },
  );
  typia.assert(resetRecord);
  // 5. Validate the retrieved password reset record structure
  TestValidator.equals(
    "reset record id matches query id",
    resetRecord.id,
    resetId,
  );
  TestValidator.equals(
    "reset record has valid member ID",
    resetRecord.hrms_member_id,
    member.id,
  );
  TestValidator.predicate(
    "reset record has valid expiration timestamp",
    resetRecord.expires_at !== undefined,
  );
  TestValidator.predicate(
    "reset record has valid created timestamp",
    resetRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "reset record has valid updated timestamp",
    resetRecord.updated_at !== undefined,
  );
  // Note: used_at can be null (unused) or contain a timestamp (used)
  if (resetRecord.used_at !== null) {
    TestValidator.predicate(
      "used_at is valid date-time format when set",
      new Date(resetRecord.used_at).toISOString() !== "Invalid Date",
    );
  }
}
