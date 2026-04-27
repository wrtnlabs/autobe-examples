import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_logout_idempotent_already_deleted_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member — this also sets Authorization header
  await authorize_member_join(memberConnection, {});
  // 2. First logout call — should succeed (terminate the session)
  const firstLogout =
    await api.functional.communityPlatform.member.logout(memberConnection);
  typia.assert(firstLogout);
  // 3. Second logout call with same token — should also succeed (idempotent)
  const secondLogout =
    await api.functional.communityPlatform.member.logout(memberConnection);
  typia.assert(secondLogout);
}
