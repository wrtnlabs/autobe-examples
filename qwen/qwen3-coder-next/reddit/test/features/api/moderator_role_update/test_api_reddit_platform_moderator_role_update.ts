import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reddit_platform_moderator_role_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Update moderator role using available API
  const updatedModeration =
    await api.functional.redditPlatform.member.redditPlatform.moderations.updateModerator(
      memberConnection,
      {
        body: {
          role: "MODERATOR",
        } satisfies IRedditPlatformModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // 3. Verify the role was updated
  TestValidator.equals(
    "role updated to MODERATOR",
    updatedModeration.role,
    "MODERATOR",
  );
}
