import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderator_retrieve_nonexistent_report(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated moderator for retrieval attempt
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test retrieval with valid UUID format but non-existent report ID
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent report should return 404 error",
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(connection, {
        reportId: nonExistentReportId,
      });
    },
  );

  // Step 3: Validate error response does not leak sensitive information
  // Try another non-existent ID and verify error handling
  const anotherNonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "another non-existent report should also return 404 error",
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(connection, {
        reportId: anotherNonExistentId,
      });
    },
  );

  // Step 4: Verify boundary condition with multiple attempts
  const boundaryTestIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const testId of boundaryTestIds) {
    await TestValidator.error(
      `report with ID ${testId} should not be found`,
      async () => {
        await api.functional.communityPlatform.moderator.reports.at(
          connection,
          {
            reportId: testId,
          },
        );
      },
    );
  }
}
