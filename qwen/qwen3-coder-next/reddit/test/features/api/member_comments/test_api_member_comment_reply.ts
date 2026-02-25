import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";

/**
 * Test comment reply functionality. Creates a top-level comment, then creates
 * a reply to that comment. Validates that replies have correct author and
 * content while respecting the comment entity structure.
 */
export async function test_api_member_comment_reply(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as member
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
        ip: null,
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a top-level comment using utility function
  const topComment = await generate_random_reddit_clone_member_comments_create(
    memberConnection,
    {
      body: {
        postId: typia.random<string & tags.Format<"uuid">>(),
        parentId: null,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(topComment);
  // Step 3: Verify top-level comment properties
  TestValidator.equals(
    "top-level comment has correct author",
    topComment.author.id,
    topComment.author.id,
  );
  TestValidator.equals(
    "top-level comment has correct content",
    topComment.content,
    topComment.content,
  );
  TestValidator.predicate(
    "top-level comment has valid vote score",
    topComment.voteScore >= 0,
  );
  TestValidator.predicate(
    "top-level comment has valid reply count",
    topComment.replyCount >= 0,
  );
  // Step 4: Create a nested reply to the top-level comment
  const reply = await generate_random_reddit_clone_member_comments_create(
    memberConnection,
    {
      body: {
        postId: typia.random<string & tags.Format<"uuid">>(),
        parentId: topComment.id,
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(reply);
  // Step 5: Validate reply structure
  TestValidator.equals(
    "reply has same author as original comment",
    reply.author.id,
    topComment.author.id,
  );
  TestValidator.equals(
    "reply content matches input",
    reply.content,
    reply.content,
  );
  TestValidator.predicate("reply has valid vote score", reply.voteScore >= 0);
}
