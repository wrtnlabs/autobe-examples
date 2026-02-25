import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_snapshot_retrieval_as_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  // 2. Use authenticated admin to retrieve paginated post snapshots
  const body: ICommunityPlatformPostSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.communityPlatform.admin.postSnapshots.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate response pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is 0 or more",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is 0 or more",
    response.pagination.records >= 0,
  );
  // 4. Validate snapshot records
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // content fields can be string or null
    TestValidator.predicate(
      "snapshot contentText is string or null",
      typeof snapshot.contentText === "string" || snapshot.contentText === null,
    );
    TestValidator.predicate(
      "snapshot contentUrl is string or null",
      typeof snapshot.contentUrl === "string" || snapshot.contentUrl === null,
    );
    TestValidator.predicate(
      "snapshot contentImageUrl is string or null",
      typeof snapshot.contentImageUrl === "string" ||
        snapshot.contentImageUrl === null,
    );
  }
  // 5. Validate that snapshots are sorted by createdAt descending
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      `snapshot createdAt descending order check at ${i}`,
      response.data[i - 1].createdAt >= response.data[i].createdAt,
    );
  }
  // 6. Test unauthorized access (no auth header)
  const noAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.httpError(
    "unauthorized access for post snapshot index",
    401,
    async () => {
      await api.functional.communityPlatform.admin.postSnapshots.index(
        noAuthConnection,
        {
          body,
        },
      );
    },
  );
}
