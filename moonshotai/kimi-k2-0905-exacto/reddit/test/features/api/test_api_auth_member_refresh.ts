import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_auth_member_refresh(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: typia.random<IRedditCommunityMember.IRefresh>(),
    });
  typia.assert(output);
}
