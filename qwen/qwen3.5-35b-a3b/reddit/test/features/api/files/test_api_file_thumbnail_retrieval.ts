import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileThumbnail";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_file_thumbnail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: List thumbnails for a pre-existing file
  // Using a random file ID - in real scenario, this would be from upload endpoint
  const fileId = typia.random<string & tags.Format<"uuid">>();
  const thumbnailsResponse =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sortBy: typia.random<"created_at" | "height" | "width">(),
          sortOrder: typia.random<"asc" | "desc">(),
        },
      },
    );
  typia.assert(thumbnailsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    thumbnailsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    thumbnailsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    thumbnailsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    thumbnailsResponse.pagination.pages >= 0,
  );
  // Step 3: Retrieve individual thumbnail
  // If thumbnails exist, use first one; otherwise test with random thumbnail ID
  const thumbnailId =
    thumbnailsResponse.data.length > 0
      ? thumbnailsResponse.data[0].id
      : (typia.random<string & tags.Format<"uuid">>() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">);
  const thumbnail = await api.functional.redditCommunity.files.thumbnails.at(
    memberConnection,
    {
      fileId,
      thumbnailId,
    },
  );
  typia.assert(thumbnail);
  // Step 4: Validate thumbnail response structure
  TestValidator.equals("thumbnail id present", thumbnail.id.length > 0, true);
  TestValidator.equals(
    "thumbnail url present",
    thumbnail.thumbnail_url.length > 0,
    true,
  );
  TestValidator.equals(
    "thumbnail width is positive",
    thumbnail.width > 0,
    true,
  );
  TestValidator.equals(
    "thumbnail height is positive",
    thumbnail.height > 0,
    true,
  );
  TestValidator.predicate(
    "thumbnail format valid",
    ["jpg", "png", "webp", "gif"].includes(thumbnail.format),
  );
  TestValidator.equals(
    "thumbnail variant present",
    thumbnail.variant.length > 0,
    true,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(thumbnail.created_at).getTime() >= 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(thumbnail.updated_at).getTime() >= 0,
  );
  TestValidator.equals("deleted_at is null", thumbnail.deleted_at, null);
  // Step 5: Validate parent file relationship
  TestValidator.equals(
    "parent file id present",
    thumbnail.file.id.length > 0,
    true,
  );
  TestValidator.equals(
    "parent file mime type present",
    thumbnail.file.mimeType.length > 0,
    true,
  );
  TestValidator.equals(
    "parent file path present",
    thumbnail.file.filePath.length > 0,
    true,
  );
  TestValidator.predicate(
    "parent file created at valid",
    new Date(thumbnail.file.createdAt).getTime() >= 0,
  );
}