import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_account_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register a new member account using the utility function
  //    authorize_member_join automatically sets the Authorization header on memberConnection
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: registrationEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 3. Call GET /todoApp/member/accounts with the authenticated connection
  const account =
    await api.functional.todoApp.member.accounts.at(memberConnection);
  typia.assert(account);
  // 4. Business logic validations
  // Email must match the one used during registration
  TestValidator.equals(
    "email matches registration",
    account.email,
    registrationEmail,
  );
  // Member ID must match the authorized member's ID
  TestValidator.equals(
    "account id matches authorized id",
    account.id,
    authorized.id,
  );
  // deleted_at must be null (account is active)
  TestValidator.equals(
    "account is active (deleted_at is null)",
    account.deleted_at,
    null,
  );
  // Profile memberId must match the member's id
  TestValidator.equals(
    "profile memberId matches member id",
    account.profile.memberId,
    account.id,
  );
  // displayName must be a non-empty string
  TestValidator.predicate(
    "profile displayName is non-empty",
    account.profile.displayName.length > 0,
  );
}
