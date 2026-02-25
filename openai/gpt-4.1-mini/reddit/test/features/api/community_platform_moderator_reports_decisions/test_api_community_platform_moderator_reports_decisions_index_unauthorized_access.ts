import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportsDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_reports_decisions_index_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Directly attempt to call the moderator reports decisions index endpoint without proper moderator authorization (anonymous connection)
  // Use a random UUID for communityId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const body: ICommunityPlatformReportsDecision.IRequest = {
    page: 1,
    limit: 10,
    reportId: typia.random<string & tags.Format<"uuid">>(),
    decision: "dismiss"
  };
  await TestValidator.httpError(
    "unauthorized access to moderator report decisions index",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.communities.reports.decisions.index(
        connection,
        { communityId, body },
      );
    },
  );
}
