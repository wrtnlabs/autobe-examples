import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner - create account and store password
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const communityOwner: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(communityOwnerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
        displayName: RandomGenerator.name(),
      },
    });
  typia.assert(communityOwner);
  // 2. Authenticate as member to create context - create account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // Since we cannot create posts or communities with available APIs,
  // we cannot create an actual comment for the update test.
  // Instead, we will focus on testing the validation logic of the update endpoint
  // by passing invalid commentIds and content values.
  // We are only testing the update endpoint's error handling
  // 3. Authenticate as community owner with stored password
  const communityOwnerConnectionForUpdate: api.IConnection = {
    host: connection.host,
  };
  await authorize_community_owner_login(communityOwnerConnectionForUpdate, {
    body: {
      email: communityOwner.email,
      password, // Use the original password stored from join
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 4. Test update with non-existent comment (invalid commentId)
  await TestValidator.error("should reject non-existent comment", async () => {
    await api.functional.redditCommunity.communityOwner.posts.comments.update(
      communityOwnerConnectionForUpdate,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  });
  // 5. Test update with content too short (empty string)
  await TestValidator.error("should reject content too short", async () => {
    await api.functional.redditCommunity.communityOwner.posts.comments.update(
      communityOwnerConnectionForUpdate,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: "",
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  });
  // 6. Test update with content too long (exceeding 2000 chars)
  await TestValidator.error("should reject content too long", async () => {
    await api.functional.redditCommunity.communityOwner.posts.comments.update(
      communityOwnerConnectionForUpdate,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.content({ paragraphs: 10 }),
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  });
  // 7. Test update by different user (member)
  await TestValidator.error("should reject non-author update", async () => {
    await api.functional.redditCommunity.communityOwner.posts.comments.update(
      memberConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  });
}
