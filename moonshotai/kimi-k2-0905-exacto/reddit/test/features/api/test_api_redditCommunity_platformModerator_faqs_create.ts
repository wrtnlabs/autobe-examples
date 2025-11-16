import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFaq";

export async function test_api_redditCommunity_platformModerator_faqs_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityFaq =
    await api.functional.redditCommunity.platformModerator.faqs.create(
      connection,
      {
        body: typia.random<IRedditCommunityFaq.ICreate>(),
      },
    );
  typia.assert(output);
}
