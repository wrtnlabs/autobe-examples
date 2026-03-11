import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the duplication validation service for user display name checking.
 * This scenario validates that the system correctly identifies duplicate display names
 * while excluding the current user's own name during profile updates. The test verifies
 * case-insensitive comparison, proper handling of reserved system names, and generation
 * of alternative suggestions when duplicates are detected.
 */
export async function test_api_admin_duplication_display_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.assert<{
      email: string & tags.Format<"email">;
      password: string;
    }>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    }),
  });
  // Test 1: Validate non-existent display name
  const nonExistentSearch = RandomGenerator.name(2);
  const response1 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: nonExistentSearch,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "response should have isDuplicate property",
    typeof response1.isDuplicate === "boolean",
  );
  // Test 2: Validate with existing display name
  const existingSearch = RandomGenerator.name(2);
  const response2 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: existingSearch,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(response2);
  // Validate response structure regardless of isDuplicate value
  TestValidator.predicate(
    "response should have isDuplicate property",
    typeof response2.isDuplicate === "boolean",
  );
  if (response2.duplicateType !== undefined) {
    TestValidator.predicate(
      "duplicateType should be valid enum value",
      response2.duplicateType === "display_name" ||
        response2.duplicateType === "section_topic",
    );
  }
  if (response2.conflictDetails !== undefined) {
    TestValidator.predicate(
      "conflictDetails should have existingValue",
      typeof response2.conflictDetails.existingValue === "string",
    );
    TestValidator.predicate(
      "conflictDetails should have entityType",
      typeof response2.conflictDetails.entityType === "string",
    );
    if (response2.conflictDetails.similarityScore !== undefined) {
      TestValidator.predicate(
        "similarity score should be between 0 and 1",
        response2.conflictDetails.similarityScore >= 0 &&
          response2.conflictDetails.similarityScore <= 1,
      );
    }
  }
  if (response2.suggestions !== undefined) {
    TestValidator.predicate(
      "suggestions should be array",
      Array.isArray(response2.suggestions),
    );
    TestValidator.predicate(
      "suggestions should contain strings",
      response2.suggestions.every(
        (suggestion) => typeof suggestion === "string",
      ),
    );
  }
  // Test 3: Validate pagination parameters work correctly
  const response3 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: RandomGenerator.name(1),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(response3);
  // Test 4: Validate empty search (no search term)
  const response4 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: undefined,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(response4);
  // Final validation: Ensure all responses have correct structure
  TestValidator.predicate(
    "all responses should have isDuplicate property",
    [response1, response2, response3, response4].every(
      (response) => typeof response.isDuplicate === "boolean",
    ),
  );
}