import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMember";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_list_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Set up date range
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const minCreatedAt = sevenDaysAgo.toISOString();
  const maxCreatedAt = today.toISOString();
  // 3. Get list of members within date range
  const members = await api.functional.reddit.member.members.index(
    memberConnection,
    {
      body: {
        minCreatedAt,
        maxCreatedAt,
        page: 1,
        limit: 10,
      } satisfies IRedditMember.IRequest,
    },
  );
  typia.assert(members);
  // 4. Verify chronological order
  for (let i = 0; i < members.data.length - 1; i++) {
    TestValidator.predicate(
      `Member ${i} should be before member ${i + 1} in chronological order`,
      members.data[i].created_at <= members.data[i + 1].created_at,
    );
  }
  // 5. Verify min and max date filtering
  if (members.data.length > 0) {
    // Verify first member's created_at is >= minCreatedAt
    TestValidator.predicate(
      "First member's created_at should be >= min date",
      members.data[0].created_at >= minCreatedAt,
    );
    // Verify last member's created_at is <= maxCreatedAt
    TestValidator.predicate(
      "Last member's created_at should be <= max date",
      members.data[members.data.length - 1].created_at <= maxCreatedAt,
    );
  }
}
