import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_auth_member_join(connection: api.IConnection) {
  const output: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<IRedditCommunityMember.IJoin>(),
    });
  typia.assert(output);
}
