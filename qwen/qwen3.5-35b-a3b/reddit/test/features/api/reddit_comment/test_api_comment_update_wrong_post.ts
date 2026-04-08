import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_update_wrong_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      username: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create another member connection (different actor)
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMemberAuth = await authorize_member_join(
    anotherMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123!",
        username: typia.random<string & tags.Format<"uuid">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityMember.IJoin,
    },
  );
  typia.assert(anotherMemberAuth);
  // 2. Generate pre-existing posts (simulating resources already in the system)
  const postA: IRedditCommunityPost.ISummary =
    typia.random<IRedditCommunityPost.ISummary>();
  const postB: IRedditCommunityPost.ISummary =
    typia.random<IRedditCommunityPost.ISummary>();
  // Ensure posts have different IDs
  TestValidator.notEquals("posts have different IDs", postA.id, postB.id);
  // 3. Generate a pre-existing comment that belongs to post A
  const comment: IRedditCommunityComment =
    typia.random<IRedditCommunityComment>();
  typia.assert(comment);
  // Verify comment belongs to post A (simulate existing relationship)
  TestValidator.equals("comment belongs to post A", comment.post.id, postA.id);
  // 4. Attempt to update comment using wrong post ID (Post B's ID instead of Post A's)
  let updateError: api.HttpError | null = null;
  try {
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: postB.id, // Wrong post ID - comment belongs to postA
        commentId: comment.id,
        body: {
          content: "This should not be applied due to post mismatch",
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      updateError = exp;
    } else {
      throw exp;
    }
  }
  // 5. Verify the operation returns 404 error
  TestValidator.equals(
    "update with wrong post returns 404",
    updateError?.status,
    404,
  );
  // 6. Verify the error message indicates the post-comment mismatch
  TestValidator.predicate("error message indicates post mismatch", () => {
    if (updateError !== null) {
      const message = updateError.toJSON().message;
      return (
        typeof message === "string" &&
        (message.includes("comment") ||
          message.includes("post") ||
          message.includes("not found"))
      );
    }
    return false;
  });
}
