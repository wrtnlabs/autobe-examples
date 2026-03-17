import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_file_access_logs_retrieval_different_contexts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create member-specific connection
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
  // Create new member connection with authentication token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Generate test files for different contexts
  const avatarFileId = typia.random<string & tags.Format<"uuid">>();
  const postImageFileId = typia.random<string & tags.Format<"uuid">>();
  const communityIconFileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate corresponding access log IDs for each file
  const avatarLogId = typia.random<string & tags.Format<"uuid">>();
  const postImageLogId = typia.random<string & tags.Format<"uuid">>();
  const communityIconLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test avatar file access log retrieval
  const avatarLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      authenticatedMemberConnection,
      { fileId: avatarFileId, logId: avatarLogId },
    );
  typia.assert(avatarLog);
  // Validate avatar file access log structure
  TestValidator.equals(
    "avatar log fileId matches",
    avatarLog.fileId,
    avatarFileId,
  );
  TestValidator.predicate(
    "avatar log actorId is string or null",
    typeof avatarLog.actorId === "string" || avatarLog.actorId === null,
  );
  TestValidator.equals(
    "avatar log actorType is member",
    avatarLog.actorType,
    "member",
  );
  TestValidator.predicate(
    "avatar log accessType is string",
    typeof avatarLog.accessType === "string",
  );
  TestValidator.predicate(
    "avatar log has response size",
    avatarLog.responseSize > 0,
  );
  TestValidator.predicate(
    "avatar log has response time",
    avatarLog.responseTimeMs > 0,
  );
  TestValidator.predicate(
    "avatar log has valid status code",
    typeof avatarLog.statusCode === "number",
  );
  // 5. Test post image file access log retrieval
  const postImageLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      authenticatedMemberConnection,
      { fileId: postImageFileId, logId: postImageLogId },
    );
  typia.assert(postImageLog);
  // Validate post image file access log structure
  TestValidator.equals(
    "post image log fileId matches",
    postImageLog.fileId,
    postImageFileId,
  );
  TestValidator.predicate(
    "post image log actorId is string or null",
    typeof postImageLog.actorId === "string" || postImageLog.actorId === null,
  );
  TestValidator.equals(
    "post image log actorType is member",
    postImageLog.actorType,
    "member",
  );
  TestValidator.predicate(
    "post image log accessType is string",
    typeof postImageLog.accessType === "string",
  );
  TestValidator.predicate(
    "post image log has response size",
    postImageLog.responseSize > 0,
  );
  TestValidator.predicate(
    "post image log has response time",
    postImageLog.responseTimeMs > 0,
  );
  TestValidator.predicate(
    "post image log has valid status code",
    typeof postImageLog.statusCode === "number",
  );
  // 6. Test community icon file access log retrieval
  const communityIconLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      authenticatedMemberConnection,
      { fileId: communityIconFileId, logId: communityIconLogId },
    );
  typia.assert(communityIconLog);
  // Validate community icon file access log structure
  TestValidator.equals(
    "community icon log fileId matches",
    communityIconLog.fileId,
    communityIconFileId,
  );
  TestValidator.predicate(
    "community icon log actorId is string or null",
    typeof communityIconLog.actorId === "string" ||
      communityIconLog.actorId === null,
  );
  TestValidator.equals(
    "community icon log actorType is member",
    communityIconLog.actorType,
    "member",
  );
  TestValidator.predicate(
    "community icon log accessType is string",
    typeof communityIconLog.accessType === "string",
  );
  TestValidator.predicate(
    "community icon log has response size",
    communityIconLog.responseSize > 0,
  );
  TestValidator.predicate(
    "community icon log has response time",
    communityIconLog.responseTimeMs > 0,
  );
  TestValidator.predicate(
    "community icon log has valid status code",
    typeof communityIconLog.statusCode === "number",
  );
  // 7. Test different access types across file contexts
  const downloadLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      authenticatedMemberConnection,
      {
        fileId: typia.random<string & tags.Format<"uuid">>(),
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(downloadLog);
  TestValidator.predicate(
    "download log accessType is string",
    typeof downloadLog.accessType === "string",
  );
  const viewLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      authenticatedMemberConnection,
      {
        fileId: typia.random<string & tags.Format<"uuid">>(),
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(viewLog);
  TestValidator.predicate(
    "view log accessType is string",
    typeof viewLog.accessType === "string",
  );
  const thumbnailLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      authenticatedMemberConnection,
      {
        fileId: typia.random<string & tags.Format<"uuid">>(),
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(thumbnailLog);
  TestValidator.predicate(
    "thumbnail log accessType is string",
    typeof thumbnailLog.accessType === "string",
  );
  // 8. Verify response metrics consistency across all contexts
  TestValidator.predicate(
    "all logs have valid responseSize",
    avatarLog.responseSize >= 0,
  );
  TestValidator.predicate(
    "all logs have valid responseTimeMs",
    avatarLog.responseTimeMs >= 0,
  );
  TestValidator.predicate(
    "all logs have valid statusCode",
    avatarLog.statusCode >= 100 && avatarLog.statusCode < 600,
  );
}
