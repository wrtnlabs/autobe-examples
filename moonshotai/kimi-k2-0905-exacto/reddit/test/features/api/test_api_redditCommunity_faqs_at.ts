import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFaq";

export async function test_api_redditCommunity_faqs_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityFaq =
    await api.functional.redditCommunity.faqs.at(connection, {
      faqId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
