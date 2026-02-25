import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sessions_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // List sessions with default pagination
  const output = await api.functional.todoApp.sessions.index(connection, {
    body: {},
  });
  typia.assert(output);
  // Validate pagination structure
  TestValidator.equals("pagination exists", output.pagination.current, 1);
  TestValidator.equals("default limit is 10", output.pagination.limit, 10);
  TestValidator.predicate("has total records", output.pagination.records >= 0);
  TestValidator.predicate("has total pages", output.pagination.pages >= 0);
  // Validate session structure
  if (output.data.length > 0) {
    const session = output.data[0];
    TestValidator.predicate(
      "has valid id",
      /^[0-9a-f-]{36}$/i.test(session.id),
    );
    TestValidator.equals("has user summary", typeof session.user, "object");
    TestValidator.predicate(
      "has valid IP",
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
    );
    TestValidator.predicate(
      "has valid URI",
      /^https?:\/\/.+$/.test(session.href),
    );
    TestValidator.predicate(
      "has valid created_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.?[0-9]*Z?$/.test(
        session.created_at,
      ),
    );
    TestValidator.predicate(
      "has valid expired_at",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.?[0-9]*Z?$/.test(
        session.expired_at,
      ),
    );
  }
}
