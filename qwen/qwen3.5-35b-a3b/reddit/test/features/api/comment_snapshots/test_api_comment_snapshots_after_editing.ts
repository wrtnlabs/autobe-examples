import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentSnapshot";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_snapshots_after_editing(connection: api.IConnection): Promise<void> {
    // 1. Create member account
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(memberAuth);
    // 2. Create a comment (requires post, assume random post exists)
    // Generate random post ID (in real scenario, this would be created)
    const postId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // 3. Create initial comment
    const initialContent = RandomGenerator.paragraph({ sentences: 2 });
    const comment = await api.functional.redditCommunity.member.posts.comments.create(memberConnection, {
        postId: postId,
        body: { body: initialContent },
    });
    typia.assert(comment);
    // 4. Verify initial snapshot exists (version 1)
    const initialSnapshots = await api.functional.redditCommunity.comments.snapshots.index(memberConnection, {
        commentId: comment.id,
        body: { limit: 10 },
    });
    typia.assert(initialSnapshots);
    TestValidator.equals("initial snapshot count", initialSnapshots.pagination.records, 1);
    const originalSnapshot = initialSnapshots.data.find((s) => s.version === 1);
    if (originalSnapshot) {
        TestValidator.equals("original content preserved", originalSnapshot.content, initialContent);
    }
    // 5. First edit - create snapshot version 2
    const newContent1 = RandomGenerator.paragraph({ sentences: 3 });
    const editedComment1 = await api.functional.redditCommunity.member.posts.comments.update(memberConnection, {
        postId: postId,
        commentId: comment.id,
        body: { body: newContent1 },
    });
    typia.assert(editedComment1);
    // 6. Verify snapshot 2 exists
    const snapshotsAfterFirstEdit = await api.functional.redditCommunity.comments.snapshots.index(memberConnection, {
        commentId: comment.id,
        body: { limit: 10 },
    });
    typia.assert(snapshotsAfterFirstEdit);
    TestValidator.equals("snapshot count after first edit", snapshotsAfterFirstEdit.pagination.records, 2);
    const snapshotVersion2 = snapshotsAfterFirstEdit.data.find((s) => s.version === 2);
    TestValidator.equals("snapshot version 2 exists", snapshotVersion2?.version, 2);
    if (snapshotVersion2) {
        TestValidator.equals("snapshot version 2 content", snapshotVersion2.content, newContent1);
    }
    // 7. Second edit - create snapshot version 3
    const newContent2 = RandomGenerator.paragraph({ sentences: 4 });
    const editedComment2 = await api.functional.redditCommunity.member.posts.comments.update(memberConnection, {
        postId: postId,
        commentId: comment.id,
        body: { body: newContent2 },
    });
    typia.assert(editedComment2);
    // 8. Verify snapshots 2 and 3 exist
    const snapshotsAfterSecondEdit = await api.functional.redditCommunity.comments.snapshots.index(memberConnection, {
        commentId: comment.id,
        body: { limit: 10 },
    });
    typia.assert(snapshotsAfterSecondEdit);
    TestValidator.equals("snapshot count after second edit", snapshotsAfterSecondEdit.pagination.records, 3);
    const snapshotVersion3 = snapshotsAfterSecondEdit.data.find((s) => s.version === 3);
    TestValidator.equals("snapshot version 3 exists", snapshotVersion3?.version, 3);
    if (snapshotVersion3) {
        TestValidator.equals("snapshot version 3 content", snapshotVersion3.content, newContent2);
    }
    // 9. Verify version progression
    const version1 = snapshotsAfterSecondEdit.data.find((s) => s.version === 1);
    const version2 = snapshotsAfterSecondEdit.data.find((s) => s.version === 2);
    const version3 = snapshotsAfterSecondEdit.data.find((s) => s.version === 3);
    TestValidator.equals("version 1 exists", version1?.version, 1);
    TestValidator.equals("version 2 exists", version2?.version, 2);
    TestValidator.equals("version 3 exists", version3?.version, 3);
    // 10. Verify content progression
    TestValidator.equals("version 1 content is original", version1?.content, initialContent);
    TestValidator.equals("version 2 content is first edit", version2?.content, newContent1);
    TestValidator.equals("version 3 content is second edit", version3?.content, newContent2);
    // 11. Verify timestamps are in ascending order (oldest first)
    if (version1 && version2 && version3) {
        TestValidator.predicate("version 1 timestamp <= version 2 timestamp", version1.created_at <= version2.created_at);
        TestValidator.predicate("version 2 timestamp <= version 3 timestamp", version2.created_at <= version3.created_at);
    }
}