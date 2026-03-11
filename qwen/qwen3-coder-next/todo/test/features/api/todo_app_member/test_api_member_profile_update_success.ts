import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member to establish authenticated session
  const joinMemberConnection: api.IConnection = { host: connection.host };
  const memberSession = await api.functional.todoApp.auth.member.join(
    joinMemberConnection,
    {
      body: {
        email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string>()),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
        referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
        ip: typia.assert<string & tags.Format<"ipv4">>(typia.random<string>()),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberSession);
  // Update connection with access token
  const updateMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberSession.token.access,
    },
  };
  // 2. Update member's profile display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.member.profile.me.update(
    updateMemberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify the update response contains the new display name
  TestValidator.equals(
    "display name matches",
    updatedProfile.display_name,
    newDisplayName,
  );
}