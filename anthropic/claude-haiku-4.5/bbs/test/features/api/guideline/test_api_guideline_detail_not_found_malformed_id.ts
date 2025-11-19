import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentGuideline } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentGuideline";

export async function test_api_guideline_detail_not_found_malformed_id(
  connection: api.IConnection,
) {
  // Test that the endpoint returns a validation error when guidelineId is malformed (not a valid UUID)
  await TestValidator.error(
    "malformed guidelineId should return validation error",
    async () => {
      await api.functional.discussionBoard.guidelines.at(connection, {
        guidelineId: "not-a-valid-uuid" as unknown as string &
          tags.Format<"uuid">,
      });
    },
  );
}
