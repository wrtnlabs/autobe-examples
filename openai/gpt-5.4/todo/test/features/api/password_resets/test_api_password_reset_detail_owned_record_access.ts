import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_detail_owned_record_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  const detail = await api.functional.todoApp.member.passwordResets.at(
    memberConnection,
    {
      passwordResetId,
    },
  );
  typia.assert(detail);
  TestValidator.predicate("member id exists", detail.member.id.length > 0);
  TestValidator.predicate(
    "member email exists",
    detail.member.email.length > 0,
  );
  TestValidator.predicate("reset token exists", detail.token.length > 0);
  TestValidator.predicate(
    "expiration is not before creation",
    new Date(detail.expired_at).getTime() >=
      new Date(detail.created_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(detail.updated_at).getTime() >=
      new Date(detail.created_at).getTime(),
  );
  if (detail.used_at !== null) {
    TestValidator.predicate(
      "used_at is not before created_at",
      new Date(detail.used_at).getTime() >=
        new Date(detail.created_at).getTime(),
    );
  }
  if (detail.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is not before created_at",
      new Date(detail.deleted_at).getTime() >=
        new Date(detail.created_at).getTime(),
    );
  }
}
