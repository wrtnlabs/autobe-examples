import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Create an isolated connection for the public member registration flow.
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(10)}@test.com`;
  const password = true;
  const firstAuthorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(firstAuthorized);
  TestValidator.equals(
    "registered email should match",
    firstAuthorized.email,
    email,
  );
  TestValidator.predicate(
    "member id should exist",
    firstAuthorized.id.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null",
    firstAuthorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token should exist",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    firstAuthorized.token.refresh.length > 0,
  );
  await TestValidator.error(
    "duplicate member registration should fail",
    async () => {
      await api.functional.todoApp.auth.member.join(memberConnection, {
        body: {
          email,
          password: false,
        } satisfies ITodoAppMember.IJoin,
      });
    },
  );
}
