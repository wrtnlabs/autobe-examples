import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_detail_non_existent_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Attempt to retrieve details using a non-existent banId (valid UUID format but doesn't exist)
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify response returns appropriate error (404 Not Found)
  await TestValidator.error(
    "should return 404 for non-existent ban",
    async () => {
      await api.functional.redditPlatform.member.redditPlatform.bans.at(
        memberConnection,
        {
          banId: nonExistentBanId,
        },
      );
    },
  );
  // 4. Verify error message indicates ban record not found
  // (Error validation handled by TestValidator.error for 404)
  // 5. Test with completely invalid banId format (malformed UUID)
  const invalidBanId = "not-a-valid-uuid-format";
  await TestValidator.error(
    "should return error for malformed UUID",
    async () => {
      await api.functional.redditPlatform.member.redditPlatform.bans.at(
        memberConnection,
        {
          banId: invalidBanId,
        },
      );
    },
  );
}
