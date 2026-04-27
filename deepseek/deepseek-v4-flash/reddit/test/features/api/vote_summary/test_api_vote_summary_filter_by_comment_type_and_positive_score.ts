import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_vote_summary_filter_by_comment_type_and_positive_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Query vote summaries filtered by comment type with positive net score
  const page =
    await api.functional.communityPlatform.member.vote_summaries.index(
      memberConnection,
      {
        body: {
          target_type: "comment",
          min_net_score: 1,
          sort: "net_score",
        } satisfies ICommunityPlatformVoteSummary.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate filtering: each returned summary must be a comment with net_score >= 1
  for (const summary of page.data) {
    TestValidator.equals(
      "target_type is comment",
      summary.target_type,
      "comment",
    );
    TestValidator.predicate("net_score >= 1", () => summary.net_score >= 1);
  }
  // 4. Validate sorting by net_score descending if multiple results
  if (page.data.length >= 2) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        `descending net_score at index ${i}`,
        () => page.data[i - 1].net_score >= page.data[i].net_score,
      );
    }
  }
}
