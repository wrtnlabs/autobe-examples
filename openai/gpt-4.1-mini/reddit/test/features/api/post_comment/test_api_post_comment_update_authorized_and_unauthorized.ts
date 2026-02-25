import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_post_comments_create } from "../../../generate/generate_random_community_platform_user_post_comments_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_post_comment_update_authorized_and_unauthorized(connection: api.IConnection): Promise<void> {
    // Scenario 1: Comment author successfully updates their comment
    {
        // Register and authorize user
        const userConnection: api.IConnection = { host: connection.host };
        const authorizedUser = await authorize_user_join(connection, {});
        userConnection.headers = { Authorization: authorizedUser.token.access };
        // Create a community
        const community = await generate_random_community_platform_user_communities_create(userConnection, {});
        typia.assert(community);
        // Create a post in the community
        const post = await api.functional.communityPlatform.user.communities.posts.create(userConnection, {
            communityId: community.id,
            body: {
                title: RandomGenerator.name(),
                postType: "text",
                text: {
                    content: RandomGenerator.paragraph({ sentences: 3 }),
                },
            } satisfies ICommunityPlatformPost.ICreate,
        });
        typia.assert(post);
        // Create a post comment
        const comment = await generate_random_community_platform_user_post_comments_create(userConnection, {
            body: {
                post_id: post.id,
                content_text: RandomGenerator.paragraph({ sentences: 2 }),
            },
        });
        typia.assert(comment);
        // Prepare updated comment content
        const updatedContent = RandomGenerator.paragraph({ sentences: 4 }) + " ✨🎉 Special chars!";
        // Send update request
        const updatedComment = await api.functional.communityPlatform.user.postComments.update(userConnection, {
            postCommentId: comment.id,
            body: {
                contentText: updatedContent,
            } satisfies ICommunityPlatformPostComment.IUpdate,
        });
        typia.assert(updatedComment);
        // Validate updated content
        TestValidator.equals("Updated content matches", updatedComment.content, updatedContent);
        TestValidator.predicate("UpdatedAt timestamp is newer", new Date(updatedComment.updatedAt).getTime() > new Date(comment.updatedAt).getTime());
        TestValidator.equals("Comment ID unchanged", updatedComment.id, comment.id);
        TestValidator.equals("Post ID unchanged", updatedComment.postId, comment.postId);
        TestValidator.equals("Author ID unchanged", updatedComment.author.id, authorizedUser.id);
    }
    // Scenario 2: Unauthorized user attempts to update someone else's comment
    {
        // Register and authorize user A
        const userAConnection: api.IConnection = { host: connection.host };
        const userA = await authorize_user_join(connection, {});
        userAConnection.headers = { Authorization: userA.token.access };
        // Create a community by user A
        const communityA = await generate_random_community_platform_user_communities_create(userAConnection, {});
        typia.assert(communityA);
        // Create a post in the community by user A
        const postA = await api.functional.communityPlatform.user.communities.posts.create(userAConnection, {
            communityId: communityA.id,
            body: {
                title: RandomGenerator.name(),
                postType: "text",
                text: {
                    content: RandomGenerator.paragraph({ sentences: 2 }),
                },
            } satisfies ICommunityPlatformPost.ICreate,
        });
        typia.assert(postA);
        // Create a comment by user A
        const commentA = await generate_random_community_platform_user_post_comments_create(userAConnection, {
            body: {
                post_id: postA.id,
                content_text: RandomGenerator.paragraph({ sentences: 1 }),
            },
        });
        typia.assert(commentA);
        // Register and authorize user B
        const userBConnection: api.IConnection = { host: connection.host };
        const userB = await authorize_user_join(connection, {});
        userBConnection.headers = { Authorization: userB.token.access };
        // Attempt to update user A's comment by user B
        await TestValidator.error("Unauthorized update should fail", async () => {
            await api.functional.communityPlatform.user.postComments.update(userBConnection, {
                postCommentId: commentA.id,
                body: {
                    contentText: "Malicious update attempt",
                } satisfies ICommunityPlatformPostComment.IUpdate,
            });
        });
    }
    // Scenario 3: Update comment content with special characters and max length
    {
        // Register and authorize user
        const userConnection: api.IConnection = { host: connection.host };
        const authorizedUser = await authorize_user_join(connection, {});
        userConnection.headers = { Authorization: authorizedUser.token.access };
        // Create a community
        const community = await generate_random_community_platform_user_communities_create(userConnection, {});
        typia.assert(community);
        // Create a post in the community
        const post = await api.functional.communityPlatform.user.communities.posts.create(userConnection, {
            communityId: community.id,
            body: {
                title: RandomGenerator.name(),
                postType: "text",
                text: {
                    content: RandomGenerator.paragraph({ sentences: 2 }),
                },
            } satisfies ICommunityPlatformPost.ICreate,
        });
        typia.assert(post);
        // Create a comment
        const comment = await generate_random_community_platform_user_post_comments_create(userConnection, {
            body: {
                post_id: post.id,
                content_text: RandomGenerator.paragraph({ sentences: 1 }),
            },
        });
        typia.assert(comment);
        // Prepare very long content with special characters
        const maxLength = 1000; // Assume max length limit
        const specialChars = "!@#$%^&*()_+-=[]{}|;':/<>?`~✨🎉💥🔥🌟";
        const repeatedText = Array(maxLength / specialChars.length)
            .fill(specialChars)
            .join("");
        const updatedContent = repeatedText.substring(0, maxLength);
        // Update the comment
        const updatedComment = await api.functional.communityPlatform.user.postComments.update(userConnection, {
            postCommentId: comment.id,
            body: {
                contentText: updatedContent,
            } satisfies ICommunityPlatformPostComment.IUpdate,
        });
        typia.assert(updatedComment);
        // Validate content matches exactly
        TestValidator.equals("Updated content at max length matches", updatedComment.content, updatedContent);
        TestValidator.equals("Comment ID unchanged after max length update", updatedComment.id, comment.id);
    }
}
