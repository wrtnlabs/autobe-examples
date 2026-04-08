import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_retrieve_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized =
    await api.functional.ecommerceMall.auth.member.join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Generate a resetId and simulate retrieving an already-used password reset record
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // Note: Since the password reset creation and completion endpoints are not available
  // in the SDK, we simulate retrieving an existing used token. In a real test,
  // this would be an actual resetId from a completed password reset flow.
  // 3. Retrieve the password reset record
  const passwordResetConnection: api.IConnection = { host: connection.host };
  const resetRecord: IEcommerceMallMemberPasswordReset =
    await api.functional.ecommerceMall.member.password_resets.at(
      passwordResetConnection,
      { resetId },
    );
  typia.assert(resetRecord);
  // 4. Validate the response structure
  TestValidator.equals("reset ID matches", resetRecord.id, resetId);
  TestValidator.equals("member ID matches", resetRecord.member.id, member.id);
  TestValidator.equals("email matches", resetRecord.email, member.email);
  // Validate that used_at is set (token has been consumed)
  TestValidator.predicate(
    "token used_at is set",
    resetRecord.used_at !== null && resetRecord.used_at !== undefined,
  );
  // Validate that deleted_at is null (record not soft deleted)
  TestValidator.equals("deleted_at is null", resetRecord.deleted_at, null);
  // Validate timestamps are properly formatted
  TestValidator.predicate(
    "expires_at is valid date-time",
    () => !isNaN(Date.parse(resetRecord.expires_at)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(resetRecord.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(resetRecord.updated_at)),
  );
}
