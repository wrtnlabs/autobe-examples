import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_moderator_bans_create } from "../../../generate/generate_random_community_moderator_bans_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";

export async function test_api_community_moderator_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
    },
  });
  typia.assert(moderator);
  // 2. Create a new member account who will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
    },
  });
  typia.assert(member);
  // 3. Login as moderator to get authentication
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: { email: moderator.token.access, password: "123456" },
  });
  // 4. Create ban request with valid reason of 15 characters
  const reason = RandomGenerator.alphabets(15);
  const ban = await api.functional.community.moderator.bans.create(
    moderatorLoginConnection,
    {
      body: {
        community_id: "4c3e8c9c-8b0c-4a9e-8d5d-3f9d3b1a1d0b" satisfies string &
          tags.Format<"uuid">, // Must be a valid UUID
        banned_user_id:
          "9d1e4b2f-7c3d-4a1b-8d5e-6b9f8e7f6d5c" satisfies string &
            tags.Format<"uuid">, // Must be a valid UUID
      } satisfies ICommunityBannedUser.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Validate ban record properties
  TestValidator.equals(
    "banned_by_id matches moderator",
    ban.banned_by_id,
    moderator.token.access,
  );
  TestValidator.equals(
    "banned_user_id matches member",
    ban.banned_user_id,
    member.token.access,
  );
  TestValidator.equals("reason has expected length", ban.reason.length, 15);
  TestValidator.equals("deleted_at is null", ban.deleted_at, null);
}
