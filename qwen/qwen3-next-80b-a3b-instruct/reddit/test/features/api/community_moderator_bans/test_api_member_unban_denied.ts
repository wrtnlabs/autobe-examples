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

export async function test_api_member_unban_denied(
  connection: api.IConnection,
): Promise<void> {
  // Join and login as member (the unauthorized actor)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  // Login as member
  await authorize_member_login(memberConnection, {
    body: {} satisfies ICommunityMember.ILogin,
  });
  // Generate a dummy banId (ban record may or may not exist, but access should be denied)
  const dummyBanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to unban using member connection — should be forbidden
  await TestValidator.httpError(
    "member should not be able to unban",
    403,
    async () => {
      await api.functional.community.moderator.bans.erase(memberConnection, {
        banId: dummyBanId,
      });
    },
  );
}
