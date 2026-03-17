import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_detail_read_own_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(join);
  const emailVerificationId = typia.random<string & tags.Format<"uuid">>();
  const first = await api.functional.todoApp.member.emailVerifications.at(
    memberConnection,
    {
      emailVerificationId,
    },
  );
  typia.assert(first);
  const second = await api.functional.todoApp.member.emailVerifications.at(
    memberConnection,
    {
      emailVerificationId,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "requested verification id matches first read",
    first.id,
    emailVerificationId,
  );
  TestValidator.equals(
    "requested verification id matches second read",
    second.id,
    emailVerificationId,
  );
  TestValidator.equals(
    "member id matches authenticated account on first read",
    first.member.id,
    join.id,
  );
  TestValidator.equals(
    "member id matches authenticated account on second read",
    second.member.id,
    join.id,
  );
  TestValidator.equals(
    "member email matches authenticated account on first read",
    first.member.email,
    join.email,
  );
  TestValidator.equals(
    "member email matches authenticated account on second read",
    second.member.email,
    join.email,
  );
  TestValidator.equals(
    "member email_verified matches authenticated state on first read",
    first.member.email_verified,
    join.email_verified,
  );
  TestValidator.equals(
    "member email_verified matches authenticated state on second read",
    second.member.email_verified,
    join.email_verified,
  );
  TestValidator.equals(
    "expired_at is observationally stable",
    second.expired_at,
    first.expired_at,
  );
  TestValidator.equals(
    "used_at is observationally stable",
    second.used_at,
    first.used_at,
  );
  TestValidator.equals(
    "revoked_at is observationally stable",
    second.revoked_at,
    first.revoked_at,
  );
  TestValidator.equals(
    "created_at is observationally stable",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals(
    "updated_at is observationally stable",
    second.updated_at,
    first.updated_at,
  );
  TestValidator.equals(
    "deleted_at is observationally stable",
    second.deleted_at,
    first.deleted_at,
  );
  TestValidator.equals(
    "nested member summary is observationally stable",
    second.member,
    first.member,
  );
}
