import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_retrieval_author_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member accounts for authentication
  // Member A - post author for karma validation
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username:
      "test_author_" +
      RandomGenerator.alphaNumeric(4) +
      "_" +
      RandomGenerator.alphaNumeric(3),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: memberAJoinBody,
  });
  typia.assert(memberAAuthorized);
  // Member B - second voter for karma comparison
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username:
      "test_voter_" +
      RandomGenerator.alphaNumeric(4) +
      "_" +
      RandomGenerator.alphaNumeric(3),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: memberBJoinBody,
  });
  typia.assert(memberBAuthorized);
  // 2. Retrieve post by valid UUID
  // Note: In E2E test environment, we use a randomly generated UUID
  // that should correspond to an existing post in the test database
  const testPostId = typia.random<string & tags.Format<"uuid">>();
  const retrievedPost = await api.functional.redditPlatform.member.posts.at(
    connection,
    {
      postId: testPostId,
    },
  );
  typia.assert(retrievedPost);
  // 3. Validate post structure contains all required fields
  TestValidator.equals("post exists with id", retrievedPost.id, testPostId);
  TestValidator.predicate("post has title", retrievedPost.title.length > 0);
  TestValidator.equals(
    "post type is valid",
    ["text", "link", "image"].includes(retrievedPost.post_type),
    true,
  );
  // 4. Validate vote metrics are present and consistent
  TestValidator.equals(
    "upvotes count is non-negative",
    retrievedPost.upvotes_count,
    retrievedPost.upvotes_count >= 0 ? retrievedPost.upvotes_count : -1,
  );
  TestValidator.equals(
    "downvotes count is non-negative",
    retrievedPost.downvotes_count,
    retrievedPost.downvotes_count >= 0 ? retrievedPost.downvotes_count : -1,
  );
  TestValidator.equals(
    "score calculation is correct",
    retrievedPost.score,
    retrievedPost.upvotes_count - retrievedPost.downvotes_count,
  );
  TestValidator.predicate(
    "comment count is non-negative",
    retrievedPost.comment_count >= 0,
  );
  // 5. Validate author information includes karma and username
  TestValidator.equals(
    "author username is present",
    retrievedPost.author.username.length > 0,
    true,
  );
  TestValidator.predicate(
    "author karma is present and integer",
    Number.isInteger(retrievedPost.author.karma),
  );
  TestValidator.predicate(
    "author karma can be negative",
    retrievedPost.author.karma !== undefined,
  );
  // 6. Validate author identity matches expected member
  TestValidator.equals(
    "author username matches creator",
    retrievedPost.author.username,
    memberAAuthorized.username,
  );
  // 7. Validate community information is present
  TestValidator.equals(
    "community has valid name",
    retrievedPost.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "community subscriber count is non-negative",
    retrievedPost.community.subscriber_count >= 0,
    true,
  );
  // 8. Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedPost.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedPost.updated_at)),
  );
  // 9. Validate content sections are properly structured
  TestValidator.predicate(
    "textContent structure is valid",
    retrievedPost.textContent === null ||
      (typeof retrievedPost.textContent === "object" &&
        "text_content" in retrievedPost.textContent),
  );
  TestValidator.predicate(
    "linkPost structure is valid",
    retrievedPost.linkPost === null ||
      (typeof retrievedPost.linkPost === "object" &&
        "url" in retrievedPost.linkPost),
  );
  TestValidator.predicate(
    "image structure is valid",
    retrievedPost.image === null ||
      (typeof retrievedPost.image === "object" &&
        "image_url" in retrievedPost.image),
  );
  // 10. Validate vote records are properly associated with post
  TestValidator.predicate(
    "postVotes array is valid",
    Array.isArray(retrievedPost.postVotes),
  );
  if (retrievedPost.postVotes.length > 0) {
    retrievedPost.postVotes.forEach((vote) => {
      typia.assert(vote);
      TestValidator.equals(
        "vote has valid author",
        vote.author.username.length > 0,
        true,
      );
      TestValidator.equals(
        "vote has valid post reference",
        vote.post.id === retrievedPost.id,
        true,
      );
      TestValidator.equals(
        "vote type is valid",
        ["up", "down", null].includes(vote.vote_type),
        true,
      );
    });
  }
}
