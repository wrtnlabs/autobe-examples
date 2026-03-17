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

export async function test_api_member_list_browsing_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register two member accounts (with sequential delay to ensure
  // distinct created_at timestamps for sort verification)
  // First member connection
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  const member1Username = member1.username;
  // Second member connection (registered after first)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  const member2Username = member2.username;
  // Step 2: Call PATCH /community/members WITHOUT auth token (guest connection)
  const guestConnection: api.IConnection = { host: connection.host };
  const page = await api.functional.community.members.index(guestConnection, {
    body: {} satisfies ICommunityMember.IRequest,
  });
  // Step 3: Validate response structure
  typia.assert(page);
  // Step 4: Confirm both new members appear in the result set
  TestValidator.predicate("first member username appears in results", () =>
    page.data.some((m) => m.username === member1Username),
  );
  TestValidator.predicate("second member username appears in results", () =>
    page.data.some((m) => m.username === member2Username),
  );
  // Step 5: Verify results are sorted by created_at DESC (newest first)
  // The second member was created after the first, so member2 should appear
  // before member1 in the sorted result
  const idx1 = page.data.findIndex((m) => m.username === member1Username);
  const idx2 = page.data.findIndex((m) => m.username === member2Username);
  TestValidator.predicate(
    "results sorted by created_at DESC: member2 appears before member1",
    () => idx2 < idx1,
  );
  // Also verify general sort order: each item's created_at >= next item's created_at
  TestValidator.predicate("all results sorted descending by created_at", () =>
    page.data.every((item, i) => {
      if (i === 0) return true;
      return (
        new Date(page.data[i - 1]!.created_at) >= new Date(item.created_at)
      );
    }),
  );
  // Step 6: Verify pagination metadata accuracy
  const { pagination } = page;
  TestValidator.predicate(
    "pagination pages equals ceil(records / limit)",
    () =>
      pagination.limit === 0
        ? pagination.pages === 0
        : pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "pagination records >= 2 (at least our two created members)",
    () => pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination current page is 1 by default",
    () => pagination.current === 1,
  );
}
