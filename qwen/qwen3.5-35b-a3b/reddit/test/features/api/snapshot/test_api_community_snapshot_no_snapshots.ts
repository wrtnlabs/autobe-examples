import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySnapshot";
import type { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_snapshot_no_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create new connection with member token for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...authenticatedConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Fetch snapshots for a test community that has no snapshots
  const testCommunityName = RandomGenerator.name(3);
  const snapshotsResponse =
    await api.functional.redditPlatform.communities.snapshots.index(
      authenticatedConnection,
      {
        name: testCommunityName,
        body: {},
      },
    );
  typia.assert(snapshotsResponse);
  // 3. Validate empty snapshot results
  TestValidator.equals("empty data array", snapshotsResponse.data, []);
  TestValidator.equals(
    "records count zero",
    snapshotsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count zero",
    snapshotsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is one",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is default 20",
    snapshotsResponse.pagination.limit,
    20,
  );
}
