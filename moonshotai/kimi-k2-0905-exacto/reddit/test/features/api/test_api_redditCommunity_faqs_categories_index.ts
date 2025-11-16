import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFaq";

export async function test_api_redditCommunity_faqs_categories_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityFaq.ISummary =
    await api.functional.redditCommunity.faqs.categories.index(connection, {
      category: typia.random<string>(),
    });
  typia.assert(output);
}
