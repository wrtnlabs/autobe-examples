import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_daily_limit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection with token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: member.token.access };
  // 3. First profile update - should succeed
  const firstDisplayName = RandomGenerator.name();
  const firstProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: { display_name: firstDisplayName },
    },
  );
  typia.assert(firstProfile);
  TestValidator.equals(
    "first update display name",
    firstProfile.display_name,
    firstDisplayName,
  );
  TestValidator.notEquals(
    "has last change timestamp",
    firstProfile.lastDisplayNameChange,
    null,
  );
  const firstChangeTime = firstProfile.lastDisplayNameChange!;
  // 4. Second profile update within 24 hours - should be rejected with daily limit error
  const secondDisplayName = RandomGenerator.name();
  await TestValidator.error(
    "daily limit error on second update within 24 hours",
    async () =>
      await api.functional.todoApp.member.profile.update(memberConnection, {
        body: { display_name: secondDisplayName },
      }),
  );
  // 5. Verify lastDisplayNameChange timestamp was NOT updated
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: { display_name: firstDisplayName },
    },
  );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "display name unchanged after failed update",
    updatedProfile.display_name,
    firstDisplayName,
  );
  TestValidator.equals(
    "last change time unchanged after failed update",
    updatedProfile.lastDisplayNameChange,
    firstChangeTime,
  );
  // 6. Verify timestamp comparison works correctly for 24-hour logic
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "first change time is within last 24 hours",
    now.getTime() - new Date(firstChangeTime).getTime() < oneDayMs,
  );
}
