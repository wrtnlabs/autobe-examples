import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const reset = await api.functional.hrmTimeTracking.member.password_resets.at(
    memberConnection,
    {
      passwordResetId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(reset);
  TestValidator.equals(
    "password reset member summary id",
    reset.member.id,
    member.id,
  );
  TestValidator.equals(
    "password reset member summary email",
    reset.member.email,
    member.email,
  );
  TestValidator.equals(
    "password reset member summary active state",
    reset.member.is_active,
    member.isActive,
  );
  TestValidator.equals("password reset consumed state", reset.consumedAt, null);
  TestValidator.equals("password reset deleted state", reset.deletedAt, null);
}
