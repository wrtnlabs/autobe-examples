import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaHistory";
import { IRedditCommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaHistory";

export async function test_api_redditCommunity_member_members_karmaHistory_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityKarmaHistory =
    await api.functional.redditCommunity.member.members.karmaHistory.index(
      connection,
      {
        memberNickname: typia.random<string>(),
        body: typia.random<IRedditCommunityKarmaHistory.IRequest>(),
      },
    );
  typia.assert(output);
}
