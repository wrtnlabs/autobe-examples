import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_list_registration_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create 4 members with varying registration dates
  const members = await ArrayUtil.asyncMap([1, 2, 3, 4], async (index) => {
    const memberCon = { host: connection.host };
    const authorized = await authorize_member_join(memberCon, {
      body: { email: typia.random<string & tags.Format<"email">>() },
    });
    return {
      connection: memberCon,
      id: authorized.id,
    };
  });
  // Query with date range
  const users = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: "2023-12-31T23:59:59.999Z",
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(users);
  // Verify that exactly 2 users created in 2023 are returned
  TestValidator.equals(
    "should return exactly 2 users in 2023",
    users.pagination.records,
    2,
  );
}
