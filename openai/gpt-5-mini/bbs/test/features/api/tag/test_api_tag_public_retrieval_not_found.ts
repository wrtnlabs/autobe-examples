import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate that public retrieval of discussion board tags by slug returns no
 * resource when the tag does not exist or is not publicly visible.
 *
 * Business context:
 *
 * - Public consumers should only receive tags that are active and not
 *   soft-deleted. Attempting to fetch a missing/inactive tag must fail for
 *   public callers and must not return a tag payload or internal fields.
 *
 * Test steps:
 *
 * 1. Choose two slug variants (lower-case and mixed-case) that conform to slug
 *    format but do not exist in the system.
 * 2. Call the public endpoint as an unauthenticated request and assert that the
 *    request results in a runtime error (no successful tag payload).
 * 3. Do not inspect HTTP status codes or error message internals; rely on
 *    TestValidator.error to assert failure behavior.
 */
export async function test_api_tag_public_retrieval_not_found(
  connection: api.IConnection,
) {
  // Choose slugs that follow slug patterns but are not created in the system
  const lowerCaseSlug = "nonexistent-test-tag-xyz";
  const mixedCaseSlug = "Nonexistent-Test-Tag-XYZ";

  // Lower-case retrieval should fail (resource missing or not public)
  await TestValidator.error(
    "retrieving non-existent tag by lower-case slug should fail",
    async () => {
      await api.functional.discussionBoard.tags.at(connection, {
        tagSlug: lowerCaseSlug,
      });
    },
  );

  // Mixed-case retrieval (edge normalization case) should also fail
  await TestValidator.error(
    "retrieving non-existent tag by mixed-case slug should fail",
    async () => {
      await api.functional.discussionBoard.tags.at(connection, {
        tagSlug: mixedCaseSlug,
      });
    },
  );

  // Note: We intentionally do not assert HTTP status codes or inspect
  // error internals in order to comply with test guidelines. The fact that
  // the call throws indicates the resource is not publicly retrievable.
}
