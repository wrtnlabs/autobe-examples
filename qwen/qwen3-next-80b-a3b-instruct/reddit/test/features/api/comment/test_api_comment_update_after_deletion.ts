import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";

export async function test_api_comment_update_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to post comment
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: (() => {
          let password = RandomGenerator.alphaNumeric(16);
          if (!/[0-9]/.test(password)) password = password.replace(/\D/, "1");
          if (!/[!@#$%^&*]/.test(password))
            password = password.replace(/[^0-9a-zA-Z]/, "!");
          return password;
        })(),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    });
  // 3. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    });
  // 4. Since POST /communities/create endpoint not available, use a generated UUID for post
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  // 5. Create comment as member on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Soft-delete the comment as moderator (available endpoint)
  await api.functional.redditCommunity.communityModerator.posts.comments.erase(
    moderatorConnection,
    {
      postId,
      commentId: comment.id,
    },
  );
  // 7. Attempt to update the deleted comment as owner
  // Expect 403 Forbidden since deleted comments are immutable
  const updateBody: IRedditCommunityComment.IUpdate = {
    content: "Updated content after deletion (should fail)",
  } satisfies IRedditCommunityComment.IUpdate;
  await TestValidator.error(
    "should reject update of deleted comment",
    async () => {
      await api.functional.redditCommunity.communityOwner.posts.comments.update(
        ownerConnection,
        {
          postId,
          commentId: comment.id,
          body: updateBody,
        },
      );
    },
  );
}
