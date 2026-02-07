import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_community_report_post_valid(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const reason = (
    RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }) + " "
  )
    .repeat(5)
    .split("")
    .slice(0, 50)
    .join("");
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        report_categories_id: typia.random<string & tags.Format<"uuid">>(),
        reason: reason satisfies string &
          tags.MinLength<50> &
          tags.MaxLength<500>,
        reported_content_type: "post",
        reported_content_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
}
