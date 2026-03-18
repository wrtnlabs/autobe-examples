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

export async function test_api_member_email_verification_ownership_and_expiration_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const tokenProbe = RandomGenerator.alphaNumeric(32);
  const probed = await api.functional.todoApp.member.email_verifications.index(
    memberConnection,
    {
      body: {
        token: tokenProbe,
        page: 1,
        limit: 10,
        verified: null,
        expired: null,
        sort: "createdAt",
        order: "desc",
      } satisfies ITodoAppMemberEmailVerification.IRequest,
    },
  );
  typia.assert(probed);
  TestValidator.equals("page current", probed.pagination.current, 1);
  TestValidator.equals("page limit", probed.pagination.limit, 10);
  TestValidator.predicate(
    "page records non-negative",
    probed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages non-negative",
    probed.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "token probe should not expose unrelated records",
    probed.data.every((item) => item.token !== tokenProbe),
  );
  const now = new Date().toISOString();
  const expiredPage =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          expired: true,
          verified: null,
          sort: "expiredAt",
          order: "desc",
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredPage);
  TestValidator.predicate(
    "expired records must have expired_at in the past or now",
    expiredPage.data.every((item) => item.expired_at <= now),
  );
  const activePage =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          expired: false,
          verified: null,
          sort: "expiredAt",
          order: "asc",
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.predicate(
    "active records must have expired_at in the future",
    activePage.data.every((item) => item.expired_at > now),
  );
}
