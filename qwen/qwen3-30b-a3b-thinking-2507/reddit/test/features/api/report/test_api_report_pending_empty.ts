import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReport";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_pending_empty(
  connection: api.IConnection,
): Promise<void> {
  // Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // Fetch pending reports with community ID (we don't need to create reports)
  const communityId = typia.random<string>();
  const results =
    await api.functional.reddit.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId: communityId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditReport.IRequest,
      },
    );
  typia.assert(results);
  // Validate response meets expectations
  TestValidator.equals(
    "pagination current should be 1",
    results.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    results.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records should be 0",
    results.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    results.pagination.pages,
    0,
  );
  TestValidator.equals("data array should be empty", results.data.length, 0);
}
