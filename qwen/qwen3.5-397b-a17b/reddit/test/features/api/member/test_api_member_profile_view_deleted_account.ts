import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_view_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account that will be used as reference
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Verify the created member's profile is accessible (sanity check)
  const memberProfile = await api.functional.redditClone.members.at(
    connection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(memberProfile);
  TestValidator.equals("member id matches", memberProfile.id, authorized.id);
  // 3. Attempt to access a non-existent member profile (simulating deleted account)
  // Since delete endpoint is not available, use random UUID to test error handling
  const fakeMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent member profile access rejected",
    async () => {
      await api.functional.redditClone.members.at(connection, {
        memberId: fakeMemberId,
      });
    },
  );
}
