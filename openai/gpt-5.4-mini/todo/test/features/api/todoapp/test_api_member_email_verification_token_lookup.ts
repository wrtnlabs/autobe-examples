import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_email_verification_token_lookup(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const listed = await api.functional.todoApp.member.email_verifications.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies ITodoAppMemberEmailVerification.IRequest,
    },
  );
  typia.assert(listed);
  TestValidator.predicate(
    "pagination metadata should be present",
    listed.pagination.records >= 0 && listed.pagination.pages >= 0,
  );
  if (listed.data.length === 0) return;
  const target = listed.data[0];
  const filtered =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          token: target.token,
          limit: 100,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals("filtered result count", filtered.data.length, 1);
  TestValidator.equals("filtered token", filtered.data[0].token, target.token);
  TestValidator.equals("filtered id", filtered.data[0].id, target.id);
  TestValidator.equals(
    "filtered created_at",
    filtered.data[0].created_at,
    target.created_at,
  );
  TestValidator.equals(
    "filtered updated_at",
    filtered.data[0].updated_at,
    target.updated_at,
  );
  TestValidator.equals(
    "filtered expired_at",
    filtered.data[0].expired_at,
    target.expired_at,
  );
  TestValidator.equals(
    "filtered deleted_at",
    filtered.data[0].deleted_at,
    target.deleted_at,
  );
  TestValidator.equals(
    "verified_at should match the returned historical state",
    filtered.data[0].verified_at,
    target.verified_at,
  );
}
