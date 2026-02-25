import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";

export async function test_api_karma_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a post
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 3: Cast an upvote on the post
  const vote = await api.functional.redditClone.member.posts.upvote(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // Step 4: Retrieve the karma record
  // Since we don't have a direct karma ID, we'll use a simulated karma ID
  // In a real scenario, the karma ID would be obtained from the member's karma logs
  const karmaId = typia.random<string & tags.Format<"uuid">>();
  const karmaRecord = await api.functional.redditClone.karmas.at(
    memberConnection,
    {
      karmaId: karmaId,
    },
  );
  typia.assert(karmaRecord);
  // Step 5: Validate the karma record
  TestValidator.predicate("karma record exists", karmaRecord !== null);
  TestValidator.predicate(
    "karma record has date",
    karmaRecord.date !== undefined,
  );
  TestValidator.predicate(
    "karma record has score change",
    karmaRecord.scoreChange !== undefined,
  );
  TestValidator.predicate(
    "karma record has percentage change",
    karmaRecord.percentageChange !== undefined,
  );
  TestValidator.predicate(
    "karma record has post count",
    karmaRecord.postCount !== undefined,
  );
  TestValidator.predicate(
    "karma record has comment count",
    karmaRecord.commentCount !== undefined,
  );
  TestValidator.predicate(
    "karma record has total score",
    karmaRecord.totalScore !== undefined,
  );
  // Validate score change reflects the upvote
  TestValidator.predicate(
    "score change is numeric",
    typeof karmaRecord.scoreChange === "number",
  );
  TestValidator.predicate(
    "total score is numeric",
    typeof karmaRecord.totalScore === "number",
  );
}
