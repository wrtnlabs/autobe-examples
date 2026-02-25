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

export async function test_api_community_platform_moderator_reports_decisions_index_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    });
  // Update headers with authorization token
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare communityId and pagination request body
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const pageRequest: ICommunityPlatformReportsDecision.IRequest = {
    page: 1,
    limit: 10,
    reportId: typia.random<string & tags.Format<"uuid">>(),
    decision: "approve",
  };
  // 3. Call the report decisions index API
  const response: IPageICommunityPlatformReportsDecision.ISummary =
    await api.functional.communityPlatform.moderator.communities.reports.decisions.index(
      moderatorConnection,
      {
        communityId,
        body: pageRequest,
      },
    );
  // 4. Assert the response shape
  typia.assert(response);
  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  // 6. Validate records order descending by created_at
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `records sorted desc created_at [${i - 1}] >= [${i}]`,
        response.data[i - 1].created_at >= response.data[i].created_at,
      );
    }
  }
  // 7. Validate each record
  response.data.forEach((decision, index) => {
    typia.assert(decision);
    TestValidator.predicate(
      `status is approved or dismissed [${index}]`,
      decision.status === "approved" || decision.status === "dismissed",
    );
    TestValidator.predicate(
      `moderator info present [${index}]`,
      decision.moderator !== null && decision.moderator !== undefined,
    );
  });
}
