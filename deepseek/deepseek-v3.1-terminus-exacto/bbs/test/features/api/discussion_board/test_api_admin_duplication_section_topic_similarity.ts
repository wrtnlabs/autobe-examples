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

export async function test_api_admin_duplication_section_topic_similarity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test duplication validation with various search terms
  const searchTerm1 = RandomGenerator.paragraph({ sentences: 1 });
  const duplicationTest1 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: searchTerm1,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(duplicationTest1);
  // Test with pagination parameters
  const duplicationTest2 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(duplicationTest2);
  // Test without search term (should handle gracefully)
  const duplicationTest3 =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          // No search term provided
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(duplicationTest3);
  // Validate response structure for all tests
  TestValidator.predicate(
    "response should have isDuplicate property",
    duplicationTest1.isDuplicate !== undefined,
  );
  TestValidator.predicate(
    "response should have duplicateType property",
    duplicationTest1.duplicateType !== undefined,
  );
  // If duplicate is detected, validate conflict details structure
  if (duplicationTest1.isDuplicate && duplicationTest1.conflictDetails) {
    TestValidator.predicate(
      "conflict should have existingValue",
      duplicationTest1.conflictDetails.existingValue !== undefined,
    );
    TestValidator.predicate(
      "conflict should have entityType",
      duplicationTest1.conflictDetails.entityType !== undefined,
    );
    if (duplicationTest1.conflictDetails.similarityScore !== undefined) {
      TestValidator.predicate(
        "similarity score should be valid",
        duplicationTest1.conflictDetails.similarityScore >= 0 &&
          duplicationTest1.conflictDetails.similarityScore <= 1,
      );
    }
  }
  // Validate suggestions array structure when provided
  if (duplicationTest1.suggestions !== undefined) {
    TestValidator.predicate(
      "suggestions should be array",
      Array.isArray(duplicationTest1.suggestions),
    );
    if (duplicationTest1.suggestions.length > 0) {
      TestValidator.predicate(
        "suggestions should contain strings",
        duplicationTest1.suggestions.every(
          (suggestion) => typeof suggestion === "string",
        ),
      );
    }
  }
}
