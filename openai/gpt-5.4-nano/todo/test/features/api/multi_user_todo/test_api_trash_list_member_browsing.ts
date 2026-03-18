import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_trash_list_member_browsing(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  const listBodyBase: IMultiUserTodoGuest.IRequest = {
    page: 1,
    limit: 10,
    completionStatus: "all",
    sortBy: "createdAt",
    sortOrder: "asc",
  };
  const trashA = await api.functional.multiUserTodo.member.trash.index(
    memberAConnection,
    {
      body: listBodyBase satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(trashA);
  const trashB = await api.functional.multiUserTodo.member.trash.index(
    memberBConnection,
    {
      body: listBodyBase satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(trashB);
  TestValidator.predicate(
    "trashA has pagination fields",
    () =>
      typeof trashA.pagination.current === "number" &&
      typeof trashA.pagination.limit === "number" &&
      typeof trashA.pagination.records === "number" &&
      typeof trashA.pagination.pages === "number",
  );
  TestValidator.predicate("trashA items have required fields", () =>
    trashA.data.every(
      (t) =>
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.completed === "boolean" &&
        typeof t.createdAt === "string" &&
        (t.startAt === null || typeof t.startAt === "string") &&
        (t.dueAt === null || typeof t.dueAt === "string"),
    ),
  );
  if (trashA.data.length > 0) {
    const firstAId = trashA.data[0].id;
    TestValidator.predicate(
      "member B does not see member A trashed todo",
      () => !trashB.data.some((t) => t.id === firstAId),
    );
  }
  const listNullCaseStartAsc =
    await api.functional.multiUserTodo.member.trash.index(memberAConnection, {
      body: {
        page: 1,
        limit: 50,
        completionStatus: "all",
        sortBy: "startDate",
        sortOrder: "asc",
      } satisfies IMultiUserTodoGuest.IRequest,
    });
  typia.assert(listNullCaseStartAsc);
  const listNullCaseDueDesc =
    await api.functional.multiUserTodo.member.trash.index(memberAConnection, {
      body: {
        page: 1,
        limit: 50,
        completionStatus: "all",
        sortBy: "dueDate",
        sortOrder: "desc",
      } satisfies IMultiUserTodoGuest.IRequest,
    });
  typia.assert(listNullCaseDueDesc);
  if (listNullCaseStartAsc.data.some((d) => d.startAt === null)) {
    let seenNull = false;
    for (const it of listNullCaseStartAsc.data) {
      if (it.startAt === null) {
        seenNull = true;
      } else {
        TestValidator.predicate(
          "startAt nulls appear after non-nulls",
          () => !seenNull,
        );
      }
    }
  }
  if (listNullCaseDueDesc.data.some((d) => d.dueAt === null)) {
    let seenNullDue = false;
    for (const it of listNullCaseDueDesc.data) {
      if (it.dueAt === null) {
        seenNullDue = true;
      } else {
        TestValidator.predicate(
          "dueAt nulls appear after non-nulls",
          () => !seenNullDue,
        );
      }
    }
  }
}
