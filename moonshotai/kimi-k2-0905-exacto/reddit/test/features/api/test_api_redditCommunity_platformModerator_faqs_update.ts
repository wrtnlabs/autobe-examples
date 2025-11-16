import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFaq";

export async function test_api_redditCommunity_platformModerator_faqs_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityFaq =
    await api.functional.redditCommunity.platformModerator.faqs.update(
      connection,
      {
        faqId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityFaq.IUpdate>(),
      },
    );
  typia.assert(output);
}
