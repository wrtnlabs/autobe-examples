import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_post_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account with known credentials
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // 2. Login as community owner to create community
  const loginOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(loginOwnerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Create a community
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      loginOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create member account with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 5. Login as member
  const loginMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginMemberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 6. Create text post using utility function - no subscription step needed as API doesn't expose it
  const post = await generate_random_reddit_community_member_posts_create(
    loginMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 20,
        }),
        communityName: community.name,
        textContent: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 15,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Validate post properties - only business logic
  TestValidator.equals(
    "title length is between 3-200",
    post.title.length >= 3 && post.title.length <= 200,
    true,
  );
  // Verify content is text content (string)
  TestValidator.predicate("content is text type", () => {
    return typeof post.content === "string";
  });
  // Validate textContent length is between 1-10,000 characters
  const textContent = post.content as string;
  TestValidator.equals(
    "textContent length is between 1-10,000",
    textContent.length >= 1 && textContent.length <= 10000,
    true,
  );
  // Validate author is properly set (must be a valid UUID)
  TestValidator.equals(
    "author ID is UUID format",
    /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      post.author.id,
    ),
    true,
  );
  // Validate community name matches
  TestValidator.equals(
    "community name matches",
    post.community.name,
    community.name,
  );
  // Validate system-generated values
  TestValidator.equals("vote_score is 0", post.vote_score, 0);
  TestValidator.equals("comments_count is 0", post.comments_count, 0);
  TestValidator.equals("status is active", post.status, "active");
  // Validate date-time formats
  TestValidator.equals(
    "created_at is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(post.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time format",
    typia.is<string & tags.Format<"date-time">>(post.updated_at),
    true,
  );
  TestValidator.equals("deleted_at is null", post.deleted_at, null);
  // Validate karma_score is a number
  TestValidator.equals(
    "karma_score is a number",
    typeof post.karma_score === "number",
    true,
  );
}
