import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFaq";

export async function test_api_redditCommunity_member_faqs_popular(
  connection: api.IConnection,
) {
  const output: IRedditCommunityFaq.ISummary =
    await api.functional.redditCommunity.member.faqs.popular(connection);
  typia.assert(output);
}
