import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVoteStatus";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_vote_status_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Create member account
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(memberAuth);
    // 2. Generate a community ID (assuming community exists or in simulation mode)
    const communityId = typia.random<string & tags.Format<"uuid">>();
    // 3. Create a post using member connection
    const post = await api.functional.redditPlatform.member.posts.create(memberConnection, {
        body: {
            community_id: communityId,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "text" as const,
            text_content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditPlatformPost.ICreate,
    });
    typia.assert(post);
    // 4. Cast an upvote on the post
    const vote = await api.functional.redditPlatform.member.posts.vote(memberConnection, {
        postId: post.id,
        body: { vote_type: "up" as const },
    });
    typia.assert(vote);
    // 5. Check vote status
    const voteStatus = await api.functional.redditPlatform.member.posts._vote.at(memberConnection, {
        postId: post.id,
    });
    typia.assert(voteStatus);
    // 6. Validate results
    TestValidator.equals("vote type matches upvote", voteStatus.voteType, "up");
    TestValidator.notEquals("vote timestamp exists", voteStatus.voteTimestamp, null);
    TestValidator.equals("post id in response matches", voteStatus.postId, post.id);
}