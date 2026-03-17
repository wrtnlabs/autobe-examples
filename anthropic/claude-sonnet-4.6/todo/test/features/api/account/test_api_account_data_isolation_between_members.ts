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

export async function test_api_account_data_isolation_between_members(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Register Member A
  const emailA = typia.random<string & tags.Format<"email">>();
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      email: emailA,
    },
  });
  typia.assert(authorizedA);
  // Register Member B
  const emailB = typia.random<string & tags.Format<"email">>();
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: {
      email: emailB,
    },
  });
  typia.assert(authorizedB);
  // Retrieve Member A's account using their authenticated connection
  const accountA =
    await api.functional.todoApp.member.accounts.at(memberAConnection);
  typia.assert(accountA);
  // Retrieve Member B's account using their authenticated connection
  const accountB =
    await api.functional.todoApp.member.accounts.at(memberBConnection);
  typia.assert(accountB);
  // Validate Member A sees their own data
  TestValidator.equals(
    "member A email matches registration",
    accountA.email,
    emailA,
  );
  // Validate Member B sees their own data
  TestValidator.equals(
    "member B email matches registration",
    accountB.email,
    emailB,
  );
  // Validate that the two accounts have different IDs (data isolation)
  TestValidator.notEquals(
    "member A and B have different account IDs",
    accountA.id,
    accountB.id,
  );
  // Validate Member A's profile.memberId matches their own account id
  TestValidator.equals(
    "member A profile memberId matches account id",
    accountA.profile.memberId,
    accountA.id,
  );
  // Validate Member B's profile.memberId matches their own account id
  TestValidator.equals(
    "member B profile memberId matches account id",
    accountB.profile.memberId,
    accountB.id,
  );
}
