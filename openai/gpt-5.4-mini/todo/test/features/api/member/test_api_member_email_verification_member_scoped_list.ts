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

export async function test_api_member_email_verification_member_scoped_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  const output = await api.functional.todoApp.member.email_verifications.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "createdAt",
        order: "desc",
        verified: null,
        expired: null,
      } satisfies ITodoAppMemberEmailVerification.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "normal list excludes soft deleted records",
    output.data.every((item) => item.deleted_at === null),
  );
  TestValidator.predicate(
    "verification summaries include lifecycle fields",
    output.data.every(
      (item) =>
        item.id.length > 0 &&
        item.token.length > 0 &&
        item.expired_at.length > 0 &&
        item.created_at.length > 0 &&
        item.updated_at.length > 0,
    ),
  );
}
