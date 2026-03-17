import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_list_search_by_username_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a unique prefix so our test members don't collide with others
  const uniquePrefix = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  // Create member 1 with common prefix in username
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: `${uniquePrefix}_alpha`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // Create member 2 with the same common prefix in username
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: `${uniquePrefix}_beta`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // Create member 3 with a completely different username
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      username: `different_${RandomGenerator.alphaNumeric(10)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member3);
  // Step 2: Search with the common prefix, page 1, limit 1 — no auth needed
  const guestConnection: api.IConnection = { host: connection.host };
  const page1Result = await api.functional.community.members.index(
    guestConnection,
    {
      body: {
        search: uniquePrefix,
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ICommunityMember.IRequest,
    },
  );
  typia.assert(page1Result);
  // Validate page 1 pagination metadata
  TestValidator.equals(
    "page1 records count",
    page1Result.pagination.records,
    2,
  );
  TestValidator.equals("page1 pages count", page1Result.pagination.pages, 2);
  TestValidator.equals("page1 current page", page1Result.pagination.current, 1);
  TestValidator.equals("page1 limit", page1Result.pagination.limit, 1);
  TestValidator.equals("page1 data length", page1Result.data.length, 1);
  // Validate that no unrelated member is in the results
  TestValidator.predicate(
    "page1 result username contains prefix",
    page1Result.data.every((m) => m.username.includes(uniquePrefix)),
  );
  TestValidator.predicate(
    "page1 result does not include different member",
    page1Result.data.every((m) => m.id !== member3.id),
  );
  // Step 3: Search page 2, same search term
  const page2Result = await api.functional.community.members.index(
    guestConnection,
    {
      body: {
        search: uniquePrefix,
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ICommunityMember.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate page 2 pagination metadata
  TestValidator.equals(
    "page2 records count",
    page2Result.pagination.records,
    2,
  );
  TestValidator.equals("page2 current page", page2Result.pagination.current, 2);
  TestValidator.equals("page2 data length", page2Result.data.length, 1);
  // Validate that the second page member also matches the prefix
  TestValidator.predicate(
    "page2 result username contains prefix",
    page2Result.data.every((m) => m.username.includes(uniquePrefix)),
  );
  // Ensure page 1 and page 2 return different members
  TestValidator.notEquals(
    "page1 and page2 return different members",
    page1Result.data[0]!.id,
    page2Result.data[0]!.id,
  );
  // Together both pages cover both matching members
  const allFoundIds = [page1Result.data[0]!.id, page2Result.data[0]!.id].sort();
  const expectedIds = [member1.id, member2.id].sort();
  TestValidator.equals(
    "all matching members found across pages",
    allFoundIds,
    expectedIds,
  );
  // Step 4: Search with a string that matches no username
  const noMatchResult = await api.functional.community.members.index(
    guestConnection,
    {
      body: {
        search: "zzznomatch999",
        limit: 20 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ICommunityMember.IRequest,
    },
  );
  typia.assert(noMatchResult);
  // Validate empty result set
  TestValidator.equals("no match data length", noMatchResult.data.length, 0);
  TestValidator.equals("no match records", noMatchResult.pagination.records, 0);
  TestValidator.equals("no match pages", noMatchResult.pagination.pages, 0);
}
