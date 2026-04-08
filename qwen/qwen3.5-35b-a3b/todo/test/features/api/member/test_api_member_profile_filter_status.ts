import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Filter by active status - should return the member
  const activeConnection: api.IConnection = { host: connection.host };
  activeConnection.headers = {
    ...activeConnection.headers,
    Authorization: auth.token.access,
  };
  const activeResponse = await api.functional.multiUserTodo.members.index(
    activeConnection,
    {
      body: {
        status: "active",
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(activeResponse);
  TestValidator.equals(
    "active filter returns one member",
    activeResponse.data.length,
    1,
  );
  if (activeResponse.data.length > 0) {
    TestValidator.equals(
      "member has active status (deleted_at null)",
      activeResponse.data[0].deleted_at,
      null,
    );
  }
  TestValidator.equals(
    "pagination metadata present",
    activeResponse.pagination.records,
    1,
  );
  // 3. Filter by deleted status - should return empty (member is active)
  const deletedConnection: api.IConnection = { host: connection.host };
  deletedConnection.headers = {
    ...deletedConnection.headers,
    Authorization: auth.token.access,
  };
  const deletedResponse = await api.functional.multiUserTodo.members.index(
    deletedConnection,
    {
      body: {
        status: "deleted",
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(deletedResponse);
  TestValidator.equals(
    "deleted filter returns empty for active member",
    deletedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "deleted pagination records",
    deletedResponse.pagination.records,
    0,
  );
  // 4. Filter by created_at matching member's creation date - should return member
  const createdDate = auth.created_at.split("T")[0]; // Extract date portion (YYYY-MM-DD)
  const dateMatchConnection: api.IConnection = { host: connection.host };
  dateMatchConnection.headers = {
    ...dateMatchConnection.headers,
    Authorization: auth.token.access,
  };
  const dateMatchResponse = await api.functional.multiUserTodo.members.index(
    dateMatchConnection,
    {
      body: {
        created_at: createdDate,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(dateMatchResponse);
  TestValidator.equals(
    "date match filter returns one member",
    dateMatchResponse.data.length,
    1,
  );
  // 5. Filter by created_at not matching - should return empty
  const noMatchDate = "2020-01-01"; // Date that definitely doesn't match
  const noMatchConnection: api.IConnection = { host: connection.host };
  noMatchConnection.headers = {
    ...noMatchConnection.headers,
    Authorization: auth.token.access,
  };
  const noMatchResponse = await api.functional.multiUserTodo.members.index(
    noMatchConnection,
    {
      body: {
        created_at: noMatchDate,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match filter returns empty array",
    noMatchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no match pagination records",
    noMatchResponse.pagination.records,
    0,
  );
}
