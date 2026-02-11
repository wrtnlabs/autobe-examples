import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platformadmin_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a new platform admin with unique email
  const adminConnection: api.IConnection = { host: connection.host };
  const uniqueEmail = typia.random<string & typia.tags.Format<"email">>();
  const uniquePassword = RandomGenerator.alphaNumeric(16);
  const firstJoinResult: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(adminConnection, {
      body: {
        email: uniqueEmail,
        password: uniquePassword,
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  typia.assert(firstJoinResult);
  // Test: Attempt to create another platform admin with the same email
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email join should fail with 409",
    409,
    async () => {
      await authorize_platform_admin_join(duplicateConnection, {
        body: {
          email: uniqueEmail,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IRedditCommunityPlatformAdmin.IJoin,
      });
    },
  );
}
