import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFaq";
import { IRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFaq";

export async function test_api_redditCommunity_faqs_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityFaq.ISummary =
    await api.functional.redditCommunity.faqs.index(connection, {
      body: typia.random<IRedditCommunityFaq.IRequest>(),
    });
  typia.assert(output);
}
