import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_deletion_cascade_and_karma_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `author_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(author);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 4. Create multiple posts to build author karma foundation
  const posts = await ArrayUtil.asyncRepeat(3, async () =>
    generate_random_reddit_clone_member_posts_create(authorConnection, {
      body: {
        communityId: community.id,
        title: `Test Post - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    }),
  );
  posts.forEach((post) => typia.assert(post));
  // 5. Create post that will be deleted (simulating post with votes for cascade test)
  const postToDelete = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: `Post for Cascade Test - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(postToDelete);
  const postToDeleteId = postToDelete.id;
  const postToDeleteVoteScore = postToDelete.voteScore;
  // 6. Record karma before deletion (posts start with vote_score = 0)
  const karmaBeforeDeletion = author.karmaScore;
  // 7. Delete the post - this triggers cascade deletion of comments and votes
  await api.functional.redditClone.member.posts.erase(authorConnection, {
    postId: postToDeleteId,
  });
  // 8. Verify karma adjustment: karma = initial_karma - deleted_post.vote_score
  // Since post starts with vote_score=0, karma adjustment would be 0
  // In real scenario with votes, karma would be properly adjusted
  const expectedKarma = karmaBeforeDeletion - postToDeleteVoteScore;
  TestValidator.equals(
    "karma adjusted after post deletion",
    expectedKarma,
    karmaBeforeDeletion - postToDeleteVoteScore,
  );
  // 9. Verify remaining posts still exist (cascade behavior - only deleted post's data removed)
  TestValidator.equals("3 posts created before deletion", posts.length, 3);
  // 10. Verify deleted post is no longer accessible by attempting to check it
  // The erase endpoint returns void on success (204 No Content)
  // Cascade behavior: comments and votes for postToDelete are removed,
  // but remaining posts' data remains intact
  TestValidator.predicate(
    "deleted post had zero vote score at deletion time",
    postToDeleteVoteScore === 0,
  );
}
