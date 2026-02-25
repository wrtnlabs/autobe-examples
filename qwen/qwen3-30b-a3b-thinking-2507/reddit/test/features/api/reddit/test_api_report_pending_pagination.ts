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

export async function test_api_report_pending_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member sign up
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Fetch second page (page=2) of pending reports
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const reports =
    await api.functional.reddit.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId,
        body: {
          page: 2,
          limit: 20,
          status: "pending",
        } satisfies IRedditReport.IRequest,
      },
    );
  typia.assert(reports);
  // 3. Verify pagination metadata
  TestValidator.equals("pagination current", reports.pagination.current, 2);
  TestValidator.equals("pagination pages", reports.pagination.pages, 2);
  TestValidator.predicate("has data", reports.data.length > 0);
}
