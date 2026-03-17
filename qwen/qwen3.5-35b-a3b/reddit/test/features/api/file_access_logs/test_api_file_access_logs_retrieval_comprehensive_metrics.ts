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

export async function test_api_file_access_logs_retrieval_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Generate multiple file IDs and log IDs for testing different scenarios
  const fileIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const logIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 3. Retrieve access logs with various fileId/logId combinations
  // Test successful retrieval (statusCode 200)
  const successfulLogId = logIds[0];
  const successfulFileId = fileIds[0];
  const successfulLog =
    await api.functional.redditCommunity.member.files.access_logs.at(
      memberConnection,
      {
        fileId: successfulFileId,
        logId: successfulLogId,
      },
    );
  typia.assert(successfulLog);
  // 4. Validate responseTimeMs is positive integer for successful access
  TestValidator.predicate(
    "responseTimeMs is positive",
    successfulLog.responseTimeMs > 0,
  );
  // 5. Validate responseSize reflects bytes served
  TestValidator.predicate(
    "responseSize is non-negative",
    successfulLog.responseSize >= 0,
  );
  // 6. Validate createdAt timestamp is valid ISO 8601
  const createdAtDate = new Date(successfulLog.createdAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAtDate.getTime()),
  );
  // 7. Test multiple fileId/logId combinations
  const allLogs = await Promise.all(
    ArrayUtil.repeat(3, async (index) => {
      const testFileId = fileIds[index % fileIds.length];
      const testLogId = logIds[index % logIds.length];
      return await api.functional.redditCommunity.member.files.access_logs.at(
        memberConnection,
        {
          fileId: testFileId,
          logId: testLogId,
        },
      );
    }),
  );
  // 8. Validate metrics for each log
  allLogs.forEach((log, index) => {
    typia.assertGuard(log);
    // Validate responseTimeMs is positive
    TestValidator.predicate(
      `log ${index} responseTimeMs is positive`,
      log.responseTimeMs > 0,
    );
    // Validate responseSize is non-negative
    TestValidator.predicate(
      `log ${index} responseSize is non-negative`,
      log.responseSize >= 0,
    );
  });
  // 9. Validate all access log fields are present with correct types
  TestValidator.equals(
    "fileId is string",
    typeof successfulLog.fileId,
    "string",
  );
  TestValidator.equals(
    "actorType is string",
    typeof successfulLog.actorType,
    "string",
  );
  TestValidator.equals(
    "accessType is string",
    typeof successfulLog.accessType,
    "string",
  );
  TestValidator.equals(
    "statusCode is number",
    typeof successfulLog.statusCode,
    "number",
  );
  TestValidator.equals(
    "responseSize is number",
    typeof successfulLog.responseSize,
    "number",
  );
  TestValidator.equals(
    "responseTimeMs is number",
    typeof successfulLog.responseTimeMs,
    "number",
  );
  // 10. Validate nullable fields can be null
  TestValidator.predicate(
    "actorId can be null",
    successfulLog.actorId === null || typeof successfulLog.actorId === "string",
  );
  TestValidator.predicate(
    "referrer can be null",
    successfulLog.referrer === null ||
      typeof successfulLog.referrer === "string",
  );
  TestValidator.predicate(
    "userAgent can be null",
    successfulLog.userAgent === null ||
      typeof successfulLog.userAgent === "string",
  );
  TestValidator.predicate(
    "ipAddress can be null or string",
    successfulLog.ipAddress === null ||
      typeof successfulLog.ipAddress === "string",
  );
  TestValidator.predicate(
    "deletedAt can be null",
    successfulLog.deletedAt === null ||
      typeof successfulLog.deletedAt === "string",
  );
}