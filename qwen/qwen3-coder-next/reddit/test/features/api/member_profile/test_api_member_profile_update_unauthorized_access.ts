import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Data = typia.random<IRedditLikeMember.IJoin>();
  const member1 = await authorize_member_join(member1Connection, {
    body: member1Data,
  });
  typia.assert(member1);
  // Create second member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Data = typia.random<IRedditLikeMember.IJoin>();
  const member2 = await authorize_member_join(member2Connection, {
    body: member2Data,
  });
  typia.assert(member2);
  // Attempt to update member2's profile as member1 (should fail with 403)
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: null,
  } satisfies IRedditLikeMember.IUpdate;
  await TestValidator.httpError(
    "should reject unauthorized profile update",
    403,
    async () => {
      await api.functional.redditLike.member.users.update(member1Connection, {
        body: updateData,
      });
    },
  );
}
