import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_reply_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate unique credentials for moderator and member
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // Step 2: Join and authenticate moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Step 3: Join and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Authenticate moderator for API calls
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Step 5: Authenticate member for API calls
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 6: Use a dummy public post ID for testing (common practice in API testing)
  const postId = "00000000-0000-0000-0000-000000000000";
  // Step 7: Create a comment on the dummy post by the member
  const commentBody = {
    content: RandomGenerator.paragraph(),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberLoginConnection,
      {
        postId: postId,
        body: commentBody,
      },
    );
  typia.assert(comment);
  // Step 8: Create a reply to the comment by the member
  const replyBody = {
    content: RandomGenerator.paragraph(),
  } satisfies ICommunityPlatformComment.ICreate;
  const reply =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberLoginConnection,
      {
        commentId: comment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);
  // Step 9: Test that moderator can successfully delete the reply
  await api.functional.communityPlatform.moderator.comments.replies.erase(
    moderatorLoginConnection,
    {
      commentId: comment.id,
      replyId: reply.id,
    },
  );
  // Step 10: Test that member cannot delete a reply (authorization failure)
  await TestValidator.error(
    "Regular member cannot delete a reply belonging to another user",
    async () => {
      await api.functional.communityPlatform.moderator.comments.replies.erase(
        memberLoginConnection,
        {
          commentId: comment.id,
          replyId: reply.id,
        },
      );
    },
  );
}
