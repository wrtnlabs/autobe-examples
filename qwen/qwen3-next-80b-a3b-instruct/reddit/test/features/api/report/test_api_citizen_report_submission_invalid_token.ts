import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import type { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";

export async function test_api_citizen_report_submission_invalid_token(
  connection: api.IConnection,
) {
  // 1. Authenticate as citizen to get valid token
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // 2. Create a target post for reporting
  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: typia.random<ICommunityBBSPost.ICreate>(),
    });
  typia.assert(post);

  // 3. Prepare report data
  const reportData: ICommunityBBSReport.ICreate = {
    targeted_entity_type: "post",
    target_id: post.id,
    report_reason_id: typia.random<string & tags.Format<"uuid">>(),
    comment: RandomGenerator.paragraph({ sentences: 3 }),
  };

  // 4. Submit report with valid token (this should succeed)
  const validReport: ICommunityBBSReport =
    await api.functional.communityBBS.citizen.reports.create(connection, {
      body: reportData,
    });
  typia.assert(validReport);
  TestValidator.equals(
    "report created successfully",
    validReport.target_id,
    reportData.target_id,
  );

  // 5. Create a NEW fresh connection without any authentication (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
  };

  // 6. Attempt to submit report with unauthenticated (invalid) connection
  // This should fail with 401 Unauthorized since no auth token is present
  await TestValidator.error(
    "report submission should fail with unauthenticated connection",
    async () => {
      await api.functional.communityBBS.citizen.reports.create(
        unauthenticatedConnection,
        {
          body: reportData,
        },
      );
    },
  );
}
