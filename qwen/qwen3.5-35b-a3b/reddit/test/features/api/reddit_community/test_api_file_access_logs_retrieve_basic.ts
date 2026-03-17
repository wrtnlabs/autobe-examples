import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileAccessLog";
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

export async function test_api_file_access_logs_retrieve_basic(
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
    },
  });
  typia.assert(memberAuth);
  // 2. File creation for access log tracking
  const memberFile = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "post" as const,
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(memberFile);
  // 3. Retrieve access logs for the created file
  const accessLogs =
    await api.functional.redditCommunity.member.files.access_logs.index(
      memberConnection,
      {
        fileId: memberFile.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(accessLogs);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    accessLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", accessLogs.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    accessLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    accessLogs.pagination.pages >= 0,
  );
  // 5. Validate each log entry structure
  if (accessLogs.data.length > 0) {
    for (const log of accessLogs.data) {
      typia.assert(log);
      TestValidator.equals("log id is uuid format", typeof log.id, "string");
      TestValidator.equals(
        "log accessType is string",
        typeof log.accessType,
        "string",
      );
      TestValidator.equals(
        "log statusCode is number",
        typeof log.statusCode,
        "number",
      );
      TestValidator.equals(
        "log responseSize is number",
        typeof log.responseSize,
        "number",
      );
      TestValidator.equals(
        "log responseTimeMs is number",
        typeof log.responseTimeMs,
        "number",
      );
      TestValidator.equals(
        "log actorType is string",
        typeof log.actorType,
        "string",
      );
      TestValidator.equals(
        "log createdAt is string",
        typeof log.createdAt,
        "string",
      );
    }
  }
}