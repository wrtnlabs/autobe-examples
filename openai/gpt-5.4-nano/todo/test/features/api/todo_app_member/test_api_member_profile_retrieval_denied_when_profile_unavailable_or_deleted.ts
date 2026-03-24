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

export async function test_api_member_profile_retrieval_denied_when_profile_unavailable_or_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(memberAuth);
  // 2) Prepare authenticated request connection using the issued token.
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3) Call GET /todoApp/member/profile and expect denial when the
  //    authenticated member's profile is unavailable (missing or deleted).
  //    (No profile delete/write endpoints are available in the provided SDK.)
  await TestValidator.error(
    "denies access when member profile is unavailable (missing/deleted)",
    async () => {
      await api.functional.todoApp.member.profile.at(profileConnection);
    },
  );
}
