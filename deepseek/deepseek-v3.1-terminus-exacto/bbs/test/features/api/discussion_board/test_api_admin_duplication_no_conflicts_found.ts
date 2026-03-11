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
 * Test duplication validation when no conflicts exist.
 * Validates that the system correctly identifies unique display names and section topics
 * that don't conflict with existing entities, returning appropriate validation results
 * indicating no duplicates found.
 */
export async function test_api_admin_duplication_no_conflicts_found(
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
  // Test duplication validation with unique search term
  const uniqueSearchTerm =
    RandomGenerator.alphabets(10) + Date.now().toString();
  const validationResponse =
    await api.functional.discussionBoard.admin.duplication.validate(
      adminConnection,
      {
        body: {
          search: uniqueSearchTerm,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(validationResponse);
  // Validate no conflicts found
  TestValidator.equals(
    "should indicate no duplicate",
    validationResponse.isDuplicate,
    false,
  );
  TestValidator.equals(
    "duplicateType should be undefined when no conflicts",
    validationResponse.duplicateType,
    undefined,
  );
  // Validate suggestions array handling
  if (validationResponse.suggestions !== undefined) {
    TestValidator.equals(
      "suggestions should be empty array when no conflicts",
      validationResponse.suggestions.length,
      0,
    );
  }
  // Validate conflict details
  TestValidator.equals(
    "conflictDetails should be undefined when no conflicts",
    validationResponse.conflictDetails,
    undefined,
  );
}
