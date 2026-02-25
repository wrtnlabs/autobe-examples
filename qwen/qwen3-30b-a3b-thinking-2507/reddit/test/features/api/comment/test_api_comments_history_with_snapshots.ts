import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_posts_comments_create } from "../../../generate/generate_random_reddit_member_posts_comments_create";
import { prepare_random_reddit_comment } from "../../../prepare/prepare_random_reddit_comment";

export async function test_api_comments_history_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123",
      username: RandomGenerator.name(1),
    },
  });
  // 2. Create initial comment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await generate_random_reddit_member_posts_comments_create(
    memberConnection,
    {
      body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      params: { postId },
    },
  );
  typia.assert(comment);
  // 3. Retrieve history snapshots
  const history = await api.functional.reddit.member.comments.snapshots.index(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        page: 1,
        limit: 10,
        created_at_min: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        created_at_max: new Date().toISOString(),
      },
    },
  );
  typia.assert(history);
  // 4. Verify pagination parameters
  TestValidator.equals("page should be 1", history.pagination.current, 1);
  TestValidator.equals("limit should be 10", history.pagination.limit, 10);
  TestValidator.predicate(
    "total records match data length",
    history.pagination.records === history.data.length,
  );
  // 5. Verify sorting order (most recent first)
  if (history.data.length > 0) {
    const firstItem = history.data[0];
    const lastItem = history.data[history.data.length - 1];
    TestValidator.predicate(
      "created_at descending order",
      firstItem.created_at > lastItem.created_at,
    );
  }
  // 6. Verify snapshot content integrity (if any)
  if (history.data.length > 0) {
    TestValidator.predicate(
      "snapshot content integrity",
      history.data.every(
        (snapshot) =>
          typeof snapshot.content === "string" && snapshot.content.length > 0,
      ),
    );
  }
}
