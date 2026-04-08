import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_community_feed_retrieval_with_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts in the community (at least 3)
  const posts: IRedditClonePost[] = await ArrayUtil.asyncRepeat(3, async () => {
    const post: IRedditClonePost =
      await generate_random_reddit_clone_member_posts_create(memberConnection, {
        body: {
          communityId: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "text",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        },
      });
    return post;
  });
  // Validate all posts were created successfully
  TestValidator.equals("created 3 posts", posts.length, 3);
  // 4. Retrieve the community feed
  const feed: IPageIRedditClonePost.ISummary =
    await api.functional.redditClone.member.communities.feed(memberConnection, {
      communityId: community.id,
    });
  typia.assert(feed);
  // 5. Verify feed response structure
  TestValidator.predicate("feed has data", feed.data.length > 0);
  TestValidator.equals("pagination exists", feed.pagination !== null, true);
  const firstPost = feed.data[0];
  TestValidator.equals("post has id", typeof firstPost.id === "string", true);
  TestValidator.equals(
    "post has title",
    typeof firstPost.title === "string",
    true,
  );
  TestValidator.equals(
    "post has type",
    firstPost.type === "text" ||
      firstPost.type === "link" ||
      firstPost.type === "image",
    true,
  );
  TestValidator.equals(
    "post has voteScore",
    typeof firstPost.voteScore === "number",
    true,
  );
  TestValidator.equals(
    "post has commentCount",
    typeof firstPost.commentCount === "number",
    true,
  );
  TestValidator.equals(
    "post has createdAt",
    typeof firstPost.createdAt === "string",
    true,
  );
  TestValidator.equals(
    "post has author",
    firstPost.author !== null && firstPost.author !== undefined,
    true,
  );
  TestValidator.equals(
    "post has community",
    firstPost.community !== null && firstPost.community !== undefined,
    true,
  );
  TestValidator.equals(
    "post has contentPreview",
    typeof firstPost.contentPreview === "string",
    true,
  );
  // Validate author structure
  TestValidator.equals(
    "author has id",
    typeof firstPost.author.id === "string",
    true,
  );
  TestValidator.equals(
    "author has username",
    typeof firstPost.author.username === "string",
    true,
  );
  // Validate community structure
  TestValidator.equals(
    "community has id",
    typeof firstPost.community.id === "string",
    true,
  );
  TestValidator.equals(
    "community has name",
    typeof firstPost.community.name === "string",
    true,
  );
  // 6. Validate all returned posts belong to the target community
  for (const post of feed.data) {
    TestValidator.equals(
      "post belongs to target community",
      post.community.id,
      community.id,
    );
  }
}
