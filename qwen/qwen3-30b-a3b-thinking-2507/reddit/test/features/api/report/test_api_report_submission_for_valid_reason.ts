import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
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
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { generate_random_reddit_member_communities_reports_create } from "../../../generate/generate_random_reddit_member_communities_reports_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { prepare_random_reddit_report } from "../../../prepare/prepare_random_reddit_report";

export async function test_api_report_submission_for_valid_reason(
  connection: api.IConnection,
) {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, { body: {} });
  const community = await generate_random_reddit_member_communities_create(
    userConnection,
    { body: {} },
  );
  typia.assert(community);
  const report = await generate_random_reddit_member_communities_reports_create(
    userConnection,
    {
      params: { communityId: community.id },
      body: {
        reason: RandomGenerator.alphabets(20),
      } satisfies IRedditReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("status is pending", report.status, "pending");
  TestValidator.notEquals("reporter is present", report.reporter, null);
}
