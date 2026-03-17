import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path of retrieving a community icon.
 * 1. Call GET /redditCommunity/communities/{communityId}/icon endpoint
 * 2. Use a valid community UUID with an assigned icon
 * 3. Validate response contains all required fields with correct metadata
 */
export async function test_api_community_icon_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for public endpoint access
  const guestConnection: api.IConnection = { host: connection.host };
  // Retrieve community icon using valid community UUID
  const output = await api.functional.redditCommunity.communities.icon(
    guestConnection,
    {
      communityId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
  // Validate icon record structure
  TestValidator.equals(
    "community icon record ID",
    output.id,
    typia.assert<string & tags.Format<"uuid">>(output.id),
  );
  // Validate file metadata exists
  typia.assert(output.file);
  TestValidator.equals(
    "file type is community_icon",
    output.file.fileType,
    "community_icon",
  );
  // Validate file has required metadata fields
  TestValidator.predicate(
    "file has valid MIME type",
    output.file.mimeType.startsWith("image/"),
  );
  TestValidator.predicate(
    "file has valid file path",
    output.file.filePath.length > 0,
  );
  // Validate file size (optional field can be undefined)
  if (output.file.fileSize !== undefined) {
    TestValidator.predicate("file size is positive", output.file.fileSize > 0);
  }
  // Validate timestamps are valid ISO 8601 format
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    output.file.createdAt,
  );
  TestValidator.predicate(
    "file created at is valid date-time",
    new Date(createdAt).getTime() > 0,
  );
  // Validate icon record timestamps
  const createdAtTime = typia.assert<string & tags.Format<"date-time">>(
    output.created_at,
  );
  TestValidator.predicate(
    "icon record created at is valid date-time",
    new Date(createdAtTime).getTime() > 0,
  );
  const updatedAtTime = typia.assert<string & tags.Format<"date-time">>(
    output.updated_at,
  );
  TestValidator.predicate(
    "icon record updated at is valid date-time",
    new Date(updatedAtTime).getTime() > 0,
  );
  // Validate soft-deletion timestamp (can be null or valid date-time)
  if (output.deleted_at !== null) {
    typia.assert<string & tags.Format<"date-time">>(output.deleted_at);
    TestValidator.predicate(
      "deleted at is valid date-time",
      new Date(output.deleted_at!).getTime() > 0,
    );
  }
}
