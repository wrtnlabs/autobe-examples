import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful text post creation by a subscribed member.
 *
 * 1. Member registers and logs in
 * 2. Member creates a text post with title and content
 * 3. System validates post creation (voteScore = 0 and commentCount = 0)
 * 4. Test with a placeholder community ID since we cannot create communities
 */
export async function test_api_post_creation_text_success(connection: api.IConnection): Promise<void> {
    // 1. Member registration
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            username: RandomGenerator.alphaNumeric(8),
            password: "1234",
            display_name: RandomGenerator.name(),
            bio: null,
            avatar_url: null,
        } satisfies IRedditLikeMember.IJoin,
    });
    typia.assert(member);
    // Update connection with member's auth token
    const memberAuthConnection: api.IConnection = { host: connection.host };
    memberAuthConnection.headers = {
        Authorization: member.token.access,
    };
    // 2. Create text post with a placeholder community ID
    const post = await api.functional.redditLike.member.posts.create(memberAuthConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            type: "text",
            content: RandomGenerator.content({ paragraphs: 3 }),
            community_id: "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">,
        } satisfies IRedditLikePost.ICreate,
    });
    typia.assert(post);
    // 3. Validate post creation
    TestValidator.equals("post type is text", post.type, "text");
    TestValidator.equals("author matches", post.author.id, member.id);
    TestValidator.equals("voteScore initialized to 0", post.score, 0);
    TestValidator.equals("commentCount initialized to 0", post.comment_count, 0);
    TestValidator.predicate("has valid created_at", typeof post.created_at === "string");
    TestValidator.predicate("has valid updated_at", typeof post.updated_at === "string");
}