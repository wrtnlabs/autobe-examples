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

export async function test_api_citizen_report_submission_invalid_id_format(
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

  // Test report with malformed target_id
  await TestValidator.error("malformed target_id should fail", async () => {
    await api.functional.communityBBS.citizen.reports.create(connection, {
      body: {
        targeted_entity_type: "post",
        target_id: "01234567-89ab-cdef-0123-456789abcde", // 31-char UUID (missing final character)
        report_reason_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityBBSReport.ICreate,
    });
  });

  // Test report with malformed report_reason_id
  await TestValidator.error(
    "malformed report_reason_id should fail",
    async () => {
      await api.functional.communityBBS.citizen.reports.create(connection, {
        body: {
          targeted_entity_type: "post",
          target_id: post.id,
          report_reason_id: "01234567-89ab-cdef-0123-456789abcde", // 31-char UUID (missing final character)
        } satisfies ICommunityBBSReport.ICreate,
      });
    },
  );
}
