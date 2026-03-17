import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
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

export async function test_api_file_access_logs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member to get authentication token
  const memberAuthConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create file connection using member's token
  const fileConnection: api.IConnection = { host: connection.host };
  fileConnection.headers = { Authorization: memberAuth.token.access };
  // Step 3: Upload an image file to create a file in the system
  const uploadedFile = await api.functional.redditCommunity.member.files.create(
    fileConnection,
    {
      body: {
        file_type: "avatar",
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(uploadedFile);
  // Step 4: Access the uploaded file to generate access log entries
  const accessedFile = await api.functional.redditCommunity.files.at(
    fileConnection,
    {
      fileId: uploadedFile.id,
    },
  );
  typia.assert(accessedFile);
  // Step 5: Retrieve the access log entry for the file
  // Generate a log ID for testing - in real scenario this would come from listing access logs
  const accessLogId = typia.random<string & tags.Format<"uuid">>();
  const accessLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      fileConnection,
      {
        fileId: uploadedFile.id,
        logId: accessLogId,
      },
    );
  typia.assert(accessLog);
  // Step 6: Validate access log response contains all required fields
  TestValidator.equals(
    "access log file id matches",
    accessLog.fileId,
    uploadedFile.id,
  );
  TestValidator.predicate(
    "access log has actor id",
    accessLog.actorId !== undefined,
  );
  TestValidator.predicate(
    "access log has actor type",
    accessLog.actorType !== undefined,
  );
  TestValidator.predicate(
    "access log has access type",
    accessLog.accessType !== undefined,
  );
  TestValidator.predicate(
    "access log has response size",
    accessLog.responseSize !== undefined,
  );
  TestValidator.predicate(
    "access log has response time ms",
    accessLog.responseTimeMs !== undefined,
  );
  TestValidator.predicate(
    "access log has status code",
    accessLog.statusCode !== undefined,
  );
  TestValidator.predicate(
    "access log has created at",
    accessLog.createdAt !== undefined,
  );
  TestValidator.predicate(
    "access log has updated at",
    accessLog.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "access log has deleted at",
    accessLog.deletedAt !== undefined,
  );
}
