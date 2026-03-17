import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_file_process_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the test (even though no auth required)
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Non-existent file and process IDs (both random UUIDs)
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentProcessId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent file and process IDs should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.files.processes.at(
        testConnection,
        {
          fileId: nonExistentFileId,
          processId: nonExistentProcessId,
        },
      );
    },
  );
  // Test 2: Different pair of non-existent IDs
  const anotherFileId = typia.random<string & tags.Format<"uuid">>();
  const anotherProcessId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "another pair of non-existent IDs should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.files.processes.at(
        testConnection,
        {
          fileId: anotherFileId,
          processId: anotherProcessId,
        },
      );
    },
  );
}
