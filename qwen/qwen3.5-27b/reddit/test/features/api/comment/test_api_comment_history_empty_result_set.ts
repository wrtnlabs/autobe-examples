import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member with no comments receives an empty but valid paginated response.
 *
 * This test verifies the proper handling of empty result sets in the comment history API.
 * A newly registered member who has not created any comments should receive a valid
 * paginated response with zero records and an empty data array.
 */
export async function test_api_comment_history_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Retrieve comment history (should be empty)
  const history: IPageIRedditCloneComment.ISummary =
    await api.functional.redditClone.member.me.comments.history(
      memberConnection,
    );
  typia.assert(history);
  // 3. Validate empty result set structure
  TestValidator.equals(
    "pagination records is zero",
    history.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is zero", history.pagination.pages, 0);
  TestValidator.predicate("data array is empty", history.data.length === 0);
  TestValidator.predicate(
    "current page is at least 1",
    history.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", history.pagination.limit > 0);
}
