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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";

export async function test_api_comment_deletion_by_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Create member A who will be the owner of a comment
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(memberA);
  // Create member B who is unauthorized to delete the comment
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(memberB);
  // For the purpose of this test, we assume there exists a post with a known ID in the test environment
  // This is a practical workaround for the lack of a create-post API
  // This ID MUST be a valid post that exists in the test environment
  const postId = "6ec3f8c3-0a4f-4e6a-9e5f-1b8a5d8a5c6d";
  // Create a comment on the known post as member A
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId,
        },
      },
    );
  typia.assert(comment);
  // Member B attempts to delete a comment they do not own
  await TestValidator.error(
    "unauthorized user should not delete comment",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.erase(
        memberBConnection,
        {
          postId,
          commentId: comment.id,
        },
      );
    },
  );
}
