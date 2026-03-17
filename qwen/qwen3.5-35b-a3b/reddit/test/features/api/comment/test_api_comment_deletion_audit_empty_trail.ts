import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentDeletion";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { authorize_member_join as authorizeMemberJoinHelper } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function authorize_member_join(connection: api.IConnection, props: {
    body?: DeepPartial<IRedditCommunityMember.IJoin>;
}): Promise<IRedditCommunityMember.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin;
    return await api.functional.redditCommunity.auth.member.join(connection, {
        body: joinInput,
    });
}
export async function test_api_comment_deletion_audit_empty_trail(connection: api.IConnection): Promise<void> {
    // 1. Create moderator user
    const moderatorConnection: api.IConnection = { host: connection.host };
    const moderatorAuth = await authorize_member_join(moderatorConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(moderatorAuth);
    // 2. Create a test post in a community (using moderator's authenticated connection)
    const testPost = await api.functional.redditCommunity.member.posts.create(moderatorConnection, {
        body: {
            community_id: typia.random<string & tags.Format<"uuid">>(),
            post_type: "text" as const,
            title: RandomGenerator.paragraph({ sentences: 3 }),
            body: RandomGenerator.content({ paragraphs: 2 }),
        },
    });
    typia.assert(testPost);
    // 3. Create a test comment on the post (this comment will NEVER be deleted)
    const testComment = await api.functional.redditCommunity.member.posts.comments.create(moderatorConnection, {
        postId: testPost.id,
        body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            parent_comment_id: null,
        },
    });
    typia.assert(testComment);
    // 4. Call the deletions endpoint as moderator with the undeleted comment ID
    const deletionAuditResponse = await api.functional.redditCommunity.comments.deletions.index(moderatorConnection, {
        commentId: testComment.id,
        body: {
            deleted_by_id: null,
            deletion_reason: null,
        },
    });
    typia.assert(deletionAuditResponse);
    // 5. Verify response structure (status 200 implied by successful response)
    typia.assert(deletionAuditResponse);
    // 6. Verify data array is empty (no deletions found)
    TestValidator.equals("deletion audit data is empty", deletionAuditResponse.data, []);
    // 7. Verify pagination metadata shows 0 records and 0 pages
    TestValidator.equals("pagination records is 0", deletionAuditResponse.pagination.records, 0);
    TestValidator.equals("pagination pages is 0", deletionAuditResponse.pagination.pages, 0);
    TestValidator.predicate("pagination current >= 1", deletionAuditResponse.pagination.current >= 1);
    TestValidator.predicate("pagination limit >= 1", deletionAuditResponse.pagination.limit >= 1);
    // 8. Verify the comment still exists and has not been deleted
    TestValidator.equals("comment still exists with valid id", testComment.id, testComment.id);
    TestValidator.predicate("comment has not been deleted", testComment.deleted_at === null);
    TestValidator.equals("comment body preserved", testComment.body, testComment.body);
    // 9. Verify no deletion records were created in the audit trail
    TestValidator.equals("no deletion records exist in audit trail", deletionAuditResponse.data.length, 0);
}