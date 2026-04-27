import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_members_search_by_text_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register 3 members with distinct identifiable names and emails
  const aliceConnection: api.IConnection = { host: connection.host };
  const alice = await authorize_member_join(aliceConnection, {
    body: {
      email: "alice@example.com",
      password: "password1234",
      display_name: "Alice Smith",
    },
  });
  typia.assert(alice);
  const bobConnection: api.IConnection = { host: connection.host };
  const bob = await authorize_member_join(bobConnection, {
    body: {
      email: "bob@example.com",
      password: "password1234",
      display_name: "Bob Johnson",
    },
  });
  typia.assert(bob);
  const charlieConnection: api.IConnection = { host: connection.host };
  const charlie = await authorize_member_join(charlieConnection, {
    body: {
      email: "charlie@test.org",
      password: "password1234",
      display_name: "Charlie Brown",
    },
  });
  typia.assert(charlie);
  // 2. Search with 'alice' — should match Alice Smith only
  const searchAlice = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        search: "alice",
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(searchAlice);
  TestValidator.equals(
    "search 'alice' returns 1 member",
    searchAlice.data.length,
    1,
  );
  TestValidator.predicate(
    "search 'alice' finds Alice",
    () =>
      searchAlice.data[0]!.email === "alice@example.com" ||
      searchAlice.data[0]!.display_name === "Alice Smith",
  );
  // 3. Search with email: 'example' — should match Alice and Bob
  const searchEmail = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        email: "example",
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(searchEmail);
  TestValidator.predicate(
    "search email 'example' returns multiple members",
    () => searchEmail.data.length >= 2,
  );
  TestValidator.predicate("search email 'example' includes Alice", () =>
    searchEmail.data.some((m) => m.email === "alice@example.com"),
  );
  TestValidator.predicate("search email 'example' includes Bob", () =>
    searchEmail.data.some((m) => m.email === "bob@example.com"),
  );
  // 4. Search with display_name: 'Smith' — should match Alice Smith only
  const searchDisplayName = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        display_name: "Smith",
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(searchDisplayName);
  TestValidator.equals(
    "search display_name 'Smith' returns 1 member",
    searchDisplayName.data.length,
    1,
  );
  TestValidator.equals(
    "search display_name 'Smith' finds Alice",
    searchDisplayName.data[0]!.email,
    "alice@example.com",
  );
  // 5. Search with non-existent text — should return empty results
  const searchNone = await api.functional.hrmTimeTracking.members.index(
    connection,
    {
      body: {
        search: "zzz_nonexistent_999",
      } satisfies IHrmTimeTrackingMember.IRequest,
    },
  );
  typia.assert(searchNone);
  TestValidator.equals(
    "search non-existent returns 0 records",
    searchNone.data.length,
    0,
  );
  TestValidator.equals(
    "search non-existent pagination records is 0",
    searchNone.pagination.records,
    0,
  );
}
