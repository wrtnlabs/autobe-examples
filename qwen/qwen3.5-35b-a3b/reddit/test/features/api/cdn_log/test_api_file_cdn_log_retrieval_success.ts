import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
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

export async function test_api_file_cdn_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Upload image file
  const file = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "avatar",
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(file);
  // Step 3: Access file to trigger CDN delivery
  const fileDetail = await api.functional.redditCommunity.files.at(connection, {
    fileId: file.id,
  });
  typia.assert(fileDetail);
  // Step 4: Retrieve CDN log
  const logId = typia.random<string & tags.Format<"uuid">>();
  const cdnLog = await api.functional.redditCommunity.member.files.cdn_logs.at(
    memberConnection,
    { fileId: file.id, logId },
  );
  typia.assert(cdnLog);
  // Step 5: Validate CDN log structure
  TestValidator.equals(
    "cdn_node_identifier not empty",
    cdnLog.cdn_node_identifier,
    "",
  );
  TestValidator.predicate("cache_status valid", () =>
    ["HIT", "MISS", "EXPIRED"].includes(cdnLog.cache_status),
  );
  TestValidator.predicate(
    "http_status_code valid",
    () => cdnLog.http_status_code >= 200 && cdnLog.http_status_code < 600,
  );
  TestValidator.predicate(
    "response_size_bytes non-negative",
    () => cdnLog.response_size_bytes >= 0,
  );
  TestValidator.predicate(
    "cache_hit_bytes non-negative",
    () => cdnLog.cache_hit_bytes >= 0,
  );
  TestValidator.predicate(
    "origin_fetch_bytes non-negative",
    () => cdnLog.origin_fetch_bytes >= 0,
  );
  TestValidator.predicate(
    "delivered_at timestamp present",
    () => cdnLog.delivered_at !== undefined && cdnLog.delivered_at !== null,
  );
  // Step 6: Validate cache byte accounting
  const cacheByteSum = cdnLog.cache_hit_bytes + cdnLog.origin_fetch_bytes;
  TestValidator.equals(
    "cache byte accounting",
    cacheByteSum,
    cdnLog.response_size_bytes,
  );
  // Step 7: Validate file relationship
  TestValidator.predicate(
    "file relation exists",
    () => cdnLog.file !== null && cdnLog.file !== undefined,
  );
  TestValidator.equals("file id matches", cdnLog.file.id, file.id);
  TestValidator.equals(
    "file type matches",
    cdnLog.file.fileType,
    file.fileType,
  );
  TestValidator.equals(
    "file mime_type matches",
    cdnLog.file.mimeType,
    file.mimeType,
  );
  TestValidator.predicate(
    "file size present",
    () => cdnLog.file.fileSize !== undefined && cdnLog.file.fileSize !== null,
  );
  // Step 8: Validate timestamps
  TestValidator.predicate("delivered_at is valid ISO 8601", () => {
    new Date(cdnLog.delivered_at);
    return true;
  });
  TestValidator.predicate("created_at is valid ISO 8601", () => {
    new Date(cdnLog.created_at);
    return true;
  });
  TestValidator.predicate("updated_at is valid ISO 8601", () => {
    new Date(cdnLog.updated_at);
    return true;
  });
  // Step 9: Validate soft delete status
  TestValidator.equals("log not soft-deleted", cdnLog.deleted_at, null);
}
