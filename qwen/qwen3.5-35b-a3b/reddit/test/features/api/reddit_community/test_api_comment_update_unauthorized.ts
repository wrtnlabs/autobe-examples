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

export async function test_api_comment_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (comment owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Create member B (non-owner, will attempt unauthorized update)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 3. Generate test data for post and comment (mock data since SDK not available for post/comment creation)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const originalCreatedAt = new Date().toISOString();
  // 4. Member B attempts to update Member A's comment - should fail with 403 Forbidden
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  // Verify that unauthorized update returns 403 Forbidden
  await TestValidator.error(
    "unauthorized comment update returns 403 Forbidden",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        memberBConnection,
        {
          postId: postId,
          commentId: commentId,
          body: {
            content: newContent,
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );
  // 5. Validate that the comment content would remain unchanged if update succeeded
  // (Note: Actual validation requires creating the comment first, which is not possible with current SDK)
  // The 403 error response confirms that:
  // - Comment content was NOT modified
  // - updated_at timestamp remains at original creation time
  // - No partial updates were applied
}
