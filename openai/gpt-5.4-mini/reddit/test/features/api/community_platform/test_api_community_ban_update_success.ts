import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_ban_update_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Pw${RandomGenerator.alphabets(8)}!1`,
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const banId = typia.random<string & tags.Format<"uuid">>();
  const startedAt = new Date().toISOString();
  const endedAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.communityPlatform.member.communities.bans.update(
      memberConnection,
      {
        communityId,
        banId,
        body: {
          reason,
          started_at: startedAt,
          ended_at: endedAt,
        } satisfies ICommunityPlatformBan.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("ban id should be preserved", updated.id, banId);
  TestValidator.equals("ban reason should be updated", updated.reason, reason);
  TestValidator.equals(
    "ban startedAt should match the request",
    updated.startedAt,
    startedAt,
  );
  TestValidator.equals(
    "ban endedAt should match the request",
    updated.endedAt,
    endedAt,
  );
  TestValidator.equals(
    "ban deletedAt should remain null",
    updated.deletedAt,
    null,
  );
}
