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

export async function test_api_citizen_report_submission_invalid_content_type(
  connection: api.IConnection,
) {
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: typia.random<ICommunityBBSPost.ICreate>(),
    });
  typia.assert(post);

  await TestValidator.error(
    "invalid targeted_entity_type should be rejected",
    async () => {
      await api.functional.communityBBS.citizen.reports.create(connection, {
        body: {
          targeted_entity_type: "user", // Invalid value
          target_id: post.id,
          report_reason_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityBBSReport.ICreate,
      });
    },
  );
}
