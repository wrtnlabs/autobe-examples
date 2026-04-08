import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_update_own_email(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const beforeUpdatedAt = joined.updated_at;
  const beforeProfileId = joined.profile.id;
  const beforeProfileDisplayName = joined.profile.display_name;
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updated = await api.functional.todoApp.member.accounts.update(
    memberConnection,
    {
      accountId: joined.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "account id should remain the same",
    updated.id,
    joined.id,
  );
  TestValidator.equals("email should be updated", updated.email, newEmail);
  TestValidator.equals(
    "deleted_at should remain null",
    updated.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updated.updated_at,
    beforeUpdatedAt,
  );
  TestValidator.equals(
    "profile id should remain the same",
    updated.profile.id,
    beforeProfileId,
  );
  TestValidator.equals(
    "profile display name should remain unchanged",
    updated.profile.display_name,
    beforeProfileDisplayName,
  );
  TestValidator.predicate("password is not exposed", !("password" in updated));
}
