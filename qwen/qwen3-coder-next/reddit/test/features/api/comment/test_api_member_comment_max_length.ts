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

export async function test_api_member_comment_max_length(
  connection: api.IConnection,
): Promise<void> {
  // Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registeredMember);
  // Create authenticated connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: registeredMember.token.access,
    },
  };
  // Generate maximum length content (10,000 characters)
  const maxLengthContent = RandomGenerator.content({
    paragraphs: 50,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });
  const targetLength = 10000;
  const content = maxLengthContent.substring(0, targetLength);
  // Create comment with maximum content length
  // Using a valid UUID as postId since we can't create posts in the current API
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.redditClone.member.comments.create(
    authenticatedConnection,
    {
      body: {
        postId: postId,
        content: content,
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(comment);
  // Validate comment properties
  TestValidator.equals(
    "content length is 10000",
    comment.content.length,
    10000,
  );
  TestValidator.equals("content matches input", comment.content, content);
  TestValidator.equals("author is set", comment.author.id, registeredMember.id);
  TestValidator.equals(
    "author username matches",
    comment.author.username,
    registeredMember.username,
  );
}
