import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_upload_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinOutput);
  // 2. Create authenticated connection using the token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joinOutput.token.access}`,
    },
  };
  // 3. Prepare file upload request
  // Generate a random UUID for community owner_id
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a mock file URI (in real scenario, this would be a CDN path or presigned URL)
  // Using a mock image URL pointing to a test image
  const uuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const mockFileUri: string = `https://example.com/images/test-community-icon-${uuid}.png`;
  const body = {
    file_type: "community_icon" as const,
    owner_id: communityId,
    file_uri: mockFileUri,
  } satisfies IRedditCommunityFile.ICreate;
  // 4. Upload file
  const result = await api.functional.redditCommunity.member.files.create(
    authenticatedConnection,
    { body },
  );
  typia.assert(result);
  // 5. Validate response
  TestValidator.equals(
    "file type should be community_icon",
    result.fileType,
    "community_icon",
  );
  TestValidator.predicate("mime type should be valid image format", () =>
    ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
      result.mimeType,
    ),
  );
  TestValidator.predicate(
    "file size should be positive",
    () => result.fileSize > 0,
  );
  TestValidator.equals(
    "created at should exist",
    result.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "updated at should exist",
    result.updatedAt !== undefined,
    true,
  );
  // Validate thumbnail exists and has valid structure
  if (result.thumbnails !== null && result.thumbnails !== undefined) {
    TestValidator.predicate(
      "should have at least one thumbnail",
      () => result.thumbnails!.length > 0,
    );
    // Validate first thumbnail structure
    const firstThumbnail = result.thumbnails[0]!;
    TestValidator.predicate("thumbnail url should be valid uri", () =>
      /https?:\/\/.+/.test(firstThumbnail.thumbnail_url),
    );
    TestValidator.predicate(
      "thumbnail width should be positive",
      () => firstThumbnail.width > 0,
    );
    TestValidator.predicate(
      "thumbnail height should be positive",
      () => firstThumbnail.height > 0,
    );
    TestValidator.equals(
      "thumbnail format should be string",
      typeof firstThumbnail.format,
      "string",
    );
    TestValidator.equals(
      "thumbnail variant should be string",
      typeof firstThumbnail.variant,
      "string",
    );
    TestValidator.predicate(
      "thumbnail should have created_at",
      firstThumbnail.created_at !== undefined,
    );
    TestValidator.predicate(
      "thumbnail should have updated_at",
      firstThumbnail.updated_at !== undefined,
    );
  }
}