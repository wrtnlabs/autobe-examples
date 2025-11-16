import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPrivacySettings";

export async function test_api_redditCommunity_member_userProfiles_privacy_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPrivacySettings =
    await api.functional.redditCommunity.member.userProfiles.privacy.create(
      connection,
      {
        profileId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityPrivacySettings.ICreate>(),
      },
    );
  typia.assert(output);
}
