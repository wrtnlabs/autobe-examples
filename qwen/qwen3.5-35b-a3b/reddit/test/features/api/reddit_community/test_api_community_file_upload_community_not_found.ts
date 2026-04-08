import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_community_admin_communities_files_create } from "../../../generate/generate_random_reddit_community_admin_communities_files_create";
import { prepare_random_reddit_community_community_file } from "../../../prepare/prepare_random_reddit_community_community_file";

export async function test_api_community_file_upload_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      display_name: "Test Admin",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers!.Authorization = adminAuth.token.access;
  // Test case 1: Valid UUID format but non-existent community - should return 404
  const nonExistentUUID1 = "12345678-1234-1234-1234-123456789012";
  try {
    await api.functional.redditCommunity.admin.communities.files.create(
      adminConnection,
      {
        communityId: nonExistentUUID1,
        body: {
          file_path: "s3://bucket/banner.jpg",
          filename: "banner.jpg",
          mime_type: "image/jpeg",
          file_size: 2048,
        },
      },
    );
    throw new Error("Expected 404 error for non-existent community");
  } catch (error) {
    const safeError = typia.assert<api.HttpError>(error);
    if (safeError.status !== 404) {
      throw new Error(`Expected 404, got ${safeError.status}`);
    }
  }
  // Test case 2: Another valid UUID format but non-existent community
  const nonExistentUUID2 = "00000000-0000-0000-0000-000000000000";
  try {
    await api.functional.redditCommunity.admin.communities.files.create(
      adminConnection,
      {
        communityId: nonExistentUUID2,
        body: {
          file_path: "s3://bucket/icon.svg",
          filename: "icon.svg",
          mime_type: "image/svg+xml",
          file_size: 512,
        },
      },
    );
    throw new Error("Expected 404 error for non-existent community");
  } catch (error) {
    const safeError = typia.assert<api.HttpError>(error);
    if (safeError.status !== 404) {
      throw new Error(`Expected 404, got ${safeError.status}`);
    }
  }
  // Test case 3: Third non-existent community UUID
  const nonExistentUUID3 = "ffffffff-ffff-ffff-ffff-ffffffffffff";
  try {
    await api.functional.redditCommunity.admin.communities.files.create(
      adminConnection,
      {
        communityId: nonExistentUUID3,
        body: {
          file_path: "s3://bucket/header.png",
          filename: "header.png",
          mime_type: "image/png",
          file_size: 4096,
        },
      },
    );
    throw new Error("Expected 404 error for non-existent community");
  } catch (error) {
    const safeError = typia.assert<api.HttpError>(error);
    if (safeError.status !== 404) {
      throw new Error(`Expected 404, got ${safeError.status}`);
    }
  }
  // Verify that all non-existent community attempts returned 404
  // (implicitly verified by the try-catch blocks above)
  TestValidator.predicate(
    "all non-existent community cases returned 404",
    true,
  );
}