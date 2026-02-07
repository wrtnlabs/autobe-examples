import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_thread_with_nested_hierarchies(connection: api.IConnection): Promise<void> {
    // 1. Auth as member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {} satisfies ICommunityPlatformMember.IJoin
    });
    // 2. Generate random post ID for comments
    const postId = typia.random<string & tags.Format<"uuid">>();
    // 3. Create root comment (parent_id = null)
    const rootComment = await generate_random_community_platform_member_posts_comments_create(memberConnection, {
        body: {
            content: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
            parent_id: null,
        },
        params: {
            postId: postId,
        }
    });
    typia.assert(rootComment);
    // 4. Create reply to root comment (parent_id = rootComment.id)
    const secondLevelComment = await generate_random_community_platform_member_posts_comments_create(memberConnection, {
        body: {
            content: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
            parent_id: rootComment.id,
        },
        params: {
            postId: postId,
        }
    });
    typia.assert(secondLevelComment);
    // 5. Create reply to second-level comment (parent_id = secondLevelComment.id)
    const thirdLevelComment = await generate_random_community_platform_member_posts_comments_create(memberConnection, {
        body: {
            content: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
            parent_id: secondLevelComment.id,
        },
        params: {
            postId: postId,
        }
    });
    typia.assert(thirdLevelComment);
    // 6. Retrieve the full thread for root comment
    const thread = await api.functional.communityPlatform.member.comments.thread.index(memberConnection, {
        commentId: rootComment.id,
    });
    typia.assert(thread);
    // 7. Validate the parent-child relationships and sorting
    TestValidator.equals("Root comment matches", thread.id, rootComment.id);
    TestValidator.equals("Thread depth is as expected (1 level)", thread.children.length, 1);
    const secondLevelInThread = thread.children[0];
    TestValidator.equals("Second-level comment child of root", secondLevelInThread.id, secondLevelComment.id);
    TestValidator.equals("Second-level has children", secondLevelInThread.children.length, 1);
    TestValidator.equals("Third-level comment child of second-level", secondLevelInThread.children[0].id, thirdLevelComment.id);
    // Verify sorting by creation time (if it's sorted, this should match our creation order)
    TestValidator.predicate("Thread is sorted by creation time", thread.created_at <= secondLevelInThread.created_at && secondLevelInThread.created_at <= secondLevelInThread.children[0].created_at);
}