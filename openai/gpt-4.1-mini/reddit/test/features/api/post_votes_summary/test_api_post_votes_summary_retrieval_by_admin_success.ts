import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_votes_summary_retrieval_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  // 2. Prepare a postId for testing with a known UUID (random for test)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve vote summary
  const voteSummary =
    await api.functional.communityPlatform.admin.posts.votes.summary.getVotesSummary(
      adminConnection,
      { postId },
    );
  // 4. Validate response
  typia.assert(voteSummary);
  // We expect non-negative integers
  TestValidator.predicate("upvotes is non-negative", voteSummary.upvotes >= 0);
  TestValidator.predicate(
    "downvotes is non-negative",
    voteSummary.downvotes >= 0,
  );
  // 5. For demonstration, assume the summary must be consistent (upvotes and downvotes are integers)
  TestValidator.predicate(
    "upvotes is integer",
    Number.isInteger(voteSummary.upvotes),
  );
  TestValidator.predicate(
    "downvotes is integer",
    Number.isInteger(voteSummary.downvotes),
  );
}
