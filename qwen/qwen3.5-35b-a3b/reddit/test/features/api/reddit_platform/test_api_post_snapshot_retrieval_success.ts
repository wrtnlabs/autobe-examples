import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a valid post snapshot.
 *
 * Test retrieval of a post snapshot and validate all denormalized fields:
 * - id, reddit_platform_post_id, author_id: UUID format
 * - title: string with max length 300
 * - content: string | null
 * - post_type: string (TEXT, LINK, or IMAGE)
 * - url: (string & maxLength<80000>) | null
 * - image_url: (string & maxLength<80000>) | null
 * - vote_score: int32
 * - comment_count: int32
 * - snapshot_type: string (CREATE, EDIT, or DELETE)
 * - created_at: date-time format
 */
export async function test_api_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid snapshot UUID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post snapshot
  const snapshot = await api.functional.redditPlatform.post_snapshots.at(
    connection,
    {
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate all denormalized fields and format requirements
  // Validate UUID fields
  TestValidator.predicate("snapshot id is valid uuid", () =>
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );
  TestValidator.predicate("reddit_platform_post_id is valid uuid", () =>
    typia.is<string & tags.Format<"uuid">>(snapshot.reddit_platform_post_id),
  );
  TestValidator.predicate("author_id is valid uuid", () =>
    typia.is<string & tags.Format<"uuid">>(snapshot.author_id),
  );
  // Validate string fields with constraints
  TestValidator.predicate("title matches maxLength<300>", () =>
    typia.is<string & tags.MaxLength<300>>(snapshot.title),
  );
  // Validate content (string | null)
  TestValidator.predicate(
    "content is string or null",
    () => typeof snapshot.content === "string" || snapshot.content === null,
  );
  // Validate post_type
  TestValidator.predicate(
    "post_type is string",
    () => typeof snapshot.post_type === "string",
  );
  // Validate url (string | null)
  TestValidator.predicate(
    "url is (string & maxLength<80000>) or null",
    () =>
      snapshot.url === null ||
      typia.is<string & tags.MaxLength<80000>>(snapshot.url),
  );
  // Validate image_url (string | null)
  TestValidator.predicate(
    "image_url is (string & maxLength<80000>) or null",
    () =>
      snapshot.image_url === null ||
      typia.is<string & tags.MaxLength<80000>>(snapshot.image_url),
  );
  // Validate numeric fields with int32 type
  TestValidator.predicate("vote_score is int32", () =>
    typia.is<number & tags.Type<"int32">>(snapshot.vote_score),
  );
  TestValidator.predicate("comment_count is int32", () =>
    typia.is<number & tags.Type<"int32">>(snapshot.comment_count),
  );
  // Validate snapshot_type (CREATE, EDIT, or DELETE)
  TestValidator.predicate(
    "snapshot_type is string",
    () => typeof snapshot.snapshot_type === "string",
  );
  // Validate created_at date-time format
  TestValidator.predicate("created_at is date-time format", () =>
    typia.is<string & tags.Format<"date-time">>(snapshot.created_at),
  );
}
