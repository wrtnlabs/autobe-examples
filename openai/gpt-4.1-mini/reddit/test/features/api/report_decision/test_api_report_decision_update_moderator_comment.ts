import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_moderator_reports_decisions_create_report_decision";
import { prepare_random_community_platform_reports_decision } from "../../../prepare/prepare_random_community_platform_reports_decision";

export async function test_api_report_decision_update_moderator_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register moderator and get authorized connection
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    { body: {} },
  );
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Create report decision under the moderator's authorization
  const originalDecision =
    await generate_random_community_platform_moderator_reports_decisions_create_report_decision(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(originalDecision);
  // Scenario 1: Successfully update a report decision comment
  {
    const newComment = `Moderator comment update ${Date.now()}`;
    const updatedDecision =
      await api.functional.communityPlatform.moderator.reports_decisions.updateReportDecision(
        moderatorConnection,
        {
          id: originalDecision.id,
          body: { comment: newComment },
        },
      );
    typia.assert(updatedDecision);
    TestValidator.equals(
      "comment updated",
      updatedDecision.comments,
      newComment,
    );
    TestValidator.equals(
      "decision unchanged",
      updatedDecision.decision,
      originalDecision.decision,
    );
  }
  // Scenario 2: Update with comment null or omitted (should preserve or allow null)
  for (const commentValue of [null, undefined]) {
    const updateBody: any = {};
    if (commentValue !== undefined) updateBody.comment = commentValue;
    const updatedDecision =
      await api.functional.communityPlatform.moderator.reports_decisions.updateReportDecision(
        moderatorConnection,
        {
          id: originalDecision.id,
          body: updateBody,
        },
      );
    typia.assert(updatedDecision);
    if (commentValue === null) {
      TestValidator.equals("comment null", updatedDecision.comments, null);
    } else {
      // undefined - comment preserved
      TestValidator.equals(
        "comment preserved",
        updatedDecision.comments,
        originalDecision.comments,
      );
    }
  }
  // Scenario 3: Unauthorized update attempt
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await TestValidator.httpError("unauthorized update", 403, async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.updateReportDecision(
        unauthorizedConnection,
        {
          id: originalDecision.id,
          body: { comment: "Unauthorized attempt" },
        },
      );
    });
  }
}
