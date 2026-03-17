import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_self_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
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
  const member = await api.functional.todoApp.members.at(memberConnection, {
    memberId: authorized.id,
  });
  typia.assert(member);
  TestValidator.equals(
    "member id matches authenticated actor",
    member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches authenticated actor",
    member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member email verification state matches authenticated actor",
    member.email_verified,
    authorized.email_verified,
  );
  TestValidator.equals(
    "member creation timestamp matches authenticated actor",
    member.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "member update timestamp matches authenticated actor",
    member.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "member deletion timestamp matches authenticated actor",
    member.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.equals(
    "password field is not exposed",
    Object.prototype.hasOwnProperty.call(member, "password"),
    false,
  );
  TestValidator.equals(
    "password_hash field is not exposed",
    Object.prototype.hasOwnProperty.call(member, "password_hash"),
    false,
  );
}
