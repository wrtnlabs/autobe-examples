import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_redditCommunity_platformModerator_members_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityMember =
    await api.functional.redditCommunity.platformModerator.members.index(
      connection,
      {
        body: typia.random<IRedditCommunityMember.IRequest>(),
      },
    );
  typia.assert(output);
}
