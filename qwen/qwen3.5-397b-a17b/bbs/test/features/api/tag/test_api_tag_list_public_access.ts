import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test public access to tag list endpoint without authentication.
 *
 * Verifies that the tag list can be retrieved by any actor (guest, member, admin)
 * without requiring authentication. Tests the endpoint with default pagination
 * parameters and validates the response structure contains proper pagination
 * metadata and tag summaries with id, name, and created_at fields.
 */
export async function test_api_tag_list_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Call the tag list endpoint with empty request body (default parameters)
  const tagList = await api.functional.discussionBoard.tags.index(connection, {
    body: {} satisfies IDiscussionBoardTag.IRequest,
  });
  // Validate the complete response structure
  // typia.assert() performs comprehensive validation including:
  // - pagination object with current, limit, records, pages fields
  // - data array containing tag summaries with id (UUID), name, created_at (ISO datetime)
  typia.assert(tagList);
}
